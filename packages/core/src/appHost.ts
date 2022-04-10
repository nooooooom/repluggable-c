import _ from 'lodash'
import { createExtensionSlot } from './extensionSlot'
import { invokeEntryPointPhase } from './invokeShell'
import { Graph, Tarjan } from './tarjanGraph'
import type {
  APIKey,
  APILayer,
  AppHostOptions,
  EntryPoint,
  EntryPointOrPackage,
  PrivateShell,
  SlotKey
} from './types/appHost'
import type { ExtensionItem, ExtensionSlot } from './types/extensionSlot'
import { declaredAPIs, dependentAPIs } from './appHostUtils'

const isMultiArray = <T>(v: T[] | T[][]): v is T[][] => _.every(v, _.isArray)
export const castMultiArray = <T>(v: T[] | T[][]): T[][] => {
  return isMultiArray(v) ? v : [v]
}

export const areSameLayers = (
  l1: string | string[] | undefined,
  l2: string | string[] | undefined
) =>
  _.isEqual(_(l1).castArray().sort().value(), _(l2).castArray().sort().value())

interface ShellToggleSet {
  [name: string]: boolean
}

export const toShellToggleSet = (
  names: string[],
  isInstalled: boolean
): ShellToggleSet => {
  return names.reduce<ShellToggleSet>(
    (result: ShellToggleSet, name: string) => {
      result[name] = isInstalled
      return result
    },
    {}
  )
}

interface UnreadyEntryPointsStore {
  get(): EntryPoint[]
  set(entryPoints: EntryPoint[]): void
}

const createUnreadyEntryPointsStore = (): UnreadyEntryPointsStore => {
  let entryPoints: EntryPoint[] = []

  return {
    get() {
      return entryPoints
    },
    set(newEntryPoints: EntryPoint[]) {
      entryPoints = newEntryPoints
    }
  }
}

interface InternalAPILayer extends APILayer {
  dimension: number
}

const verifyLayersUniqueness = (layers?: APILayer[] | APILayer[][]) => {
  if (!layers) {
    return
  }
  const flatLayers = _.flatten(layers)
  const nonUnique = _(flatLayers)
    .countBy(({ name }) => name)
    .pickBy((v) => v > 1)
    .keys()
    .value()
  if (nonUnique.length > 0) {
    throw new Error(
      `Cannot initialize host with non unique layers: ${nonUnique}`
    )
  }
}

export function createAppHost(
  initialEntryPointsOrPackages: EntryPointOrPackage[],
  options: AppHostOptions = {}
) {
  let canInstallReadyEntryPoints: boolean = true

  verifyLayersUniqueness(options.layers)

  const layers: InternalAPILayer[][] = _.map(
    options.layers ? castMultiArray(options.layers) : [],
    (singleDimension, i) =>
      _.map(singleDimension, (layer) => ({ ...layer, dimension: i }))
  )

  const readyAPIs = new Set<APIKey>()
  const unReadyEntryPointsStore = createUnreadyEntryPointsStore()

  const uniqueShellNames = new Set<string>()
  const slotKeysByName = new Map<string, APIKey>()
  const extensionSlots = new Map<APIKey, ExtensionSlot>()

  const addedShells = new Map<string, PrivateShell>()
  const shellInstallers = new WeakMap<PrivateShell, string[]>()
  const APILayers = new WeakMap<APIKey, APILayer[] | undefined>()

  type Dependency =
    | { layer?: InternalAPILayer; apiKey: SlotKey<any> }
    | undefined
  const validateLayers = (entryPoints: EntryPoint[]) => {
    _.forEach(entryPoints, (entryPoint) => {
      if (
        !entryPoint.getDependencyAPIs ||
        !entryPoint.layer ||
        _.isEmpty(layers)
      ) {
        return
      }

      const highestLevelDependencies: Dependency[] = _.chain(
        entryPoint.getDependencyAPIs()
      )
        .flatMap<Dependency>((apiKey) =>
          apiKey.layer
            ? _(apiKey.layer)
                .castArray()
                .map((l) => ({
                  layer: getLayerByName(l),
                  apiKey
                }))
                .value()
            : { apiKey }
        )
        .groupBy((dependency) => dependency?.layer?.dimension)
        .map((dimension) =>
          _.maxBy(dimension, (dependency) =>
            dependency?.layer ? dependency.layer.level : -Infinity
          )
        )
        .value()

      const currentLayers = _(entryPoint.layer)
        .castArray()
        .map((l) => getLayerByName(l))
        .value()

      const getCurrentLayerOfSameDimension = (
        layer: InternalAPILayer
      ): InternalAPILayer | undefined => {
        return currentLayers.find(
          (entryPointLayer) => entryPointLayer.dimension === layer.dimension
        )
      }

      highestLevelDependencies.forEach((highestLevelDependency) => {
        const currentLayer =
          highestLevelDependency?.layer &&
          getCurrentLayerOfSameDimension(highestLevelDependency.layer)
        if (
          highestLevelDependency?.layer &&
          currentLayer &&
          currentLayer.level < highestLevelDependency.layer.level
        ) {
          throw new Error(
            `Entry point ${entryPoint.name} of layer ${
              currentLayer.name
            } cannot depend on API ${slotKeyToName(
              highestLevelDependency.apiKey
            )} of layer ${highestLevelDependency.layer.name}`
          )
        }
      })
    })
  }

  const validateUniqueShellNames = (entryPoints: EntryPoint[]) => {
    entryPoints.forEach(({ name }) => {
      if (!uniqueShellNames.has(name)) {
        uniqueShellNames.add(name)
      } else {
        throw new Error(`PrivateShell named '${name}' already exists`)
      }
    })
  }

  const validateCircularDependency = (entryPoints: EntryPoint[]) => {
    const graph = new Graph()
    entryPoints.forEach((x) => {
      const declaredApis = declaredAPIs(x)
      const dependencies = dependentAPIs(x).map((child) => slotKeyToName(child))
      declaredApis.forEach((d) =>
        dependencies.forEach((y) => graph.addConnection(slotKeyToName(d), y))
      )
    })

    const tarjan = new Tarjan(graph)
    const sccs = tarjan.run()

    for (const scc of sccs) {
      if (scc.length > 1) {
        throw new Error(`Circular API dependency found`)
      }
    }
  }

  const addShells = (entryPointsOrPackages: EntryPointOrPackage[]) => {
    const entryPoints = _.flatten(entryPointsOrPackages)
    const existingEntryPoints = Object.values(addedShells).map(
      (shell) => shell.entryPoint
    )
    const allEntryPoints = existingEntryPoints.concat(
      unReadyEntryPointsStore.get(),
      entryPoints
    )

    if (!options.disableLayersValidation) {
      validateLayers(entryPoints)
    }
    validateUniqueShellNames(entryPoints)

    !options.disableCheckCircularDependencies &&
      validateCircularDependency(allEntryPoints)

    executeInstallShell(entryPoints)
  }

  const executeInstallShell = (entryPoints: EntryPoint[]) => {
    const [readyEntryPoints, currentUnReadyEntryPoints] = _.partition(
      entryPoints,
      (entryPoint) => {
        const dependencies =
          entryPoint.getDependencyAPIs && entryPoint.getDependencyAPIs()
        return _.every(dependencies, (k) => readyAPIs.has(getOwnSlotKey(k)))
      }
    )

    unReadyEntryPointsStore.set(
      _.union(
        _.difference(unReadyEntryPointsStore.get(), readyEntryPoints),
        currentUnReadyEntryPoints
      )
    )
    if (_.isEmpty(readyEntryPoints)) {
      return
    }

    const shells = readyEntryPoints.map(createShell)
    executeReadyEntryPoints(shells)
  }

  const executeReadyEntryPoints = (shells: PrivateShell[]) => {
    canInstallReadyEntryPoints = false
    try {
      shells.forEach((shell) => shell.initialize())
    } finally {
      canInstallReadyEntryPoints = true
    }
    executeInstallShell([...unReadyEntryPointsStore.get()])
  }

  const removeShells = (names: string[]) => {
    executeUninstallShells(names)
  }

  const executeUninstallShells = (names: string[]) => {
    const shellsCandidatesToBeDetached = _(names)
      .map((name) => addedShells.get(name))
      .compact()
      .flatMap<PrivateShell>((shell) => [shell, ...findDependantShells(shell)])
      .uniqBy('name')
      .value()

    let queue = shellsCandidatesToBeDetached
    while (!_.isEmpty(queue)) {
      const shellsToBeDetached = queue.filter(
        (ep) => !isShellBeingDependantOnInGroup(ep, queue)
      )
      if (_.isEmpty(shellsToBeDetached)) {
        throw new Error(
          `Some shells could not detach: ${queue
            .map(({ name }) => name)
            .join()}`
        )
      }
      executeDetachOnShellReadyForRemoval(shellsToBeDetached, names)
      queue = _.differenceBy(queue, shellsToBeDetached, 'name')
    }
  }

  const isShellBeingDependantOnInGroup = (
    declaringShell: PrivateShell,
    shells: PrivateShell[]
  ) => {
    return !!shells.find((dependantShell) => {
      const dependencyAPIs =
        dependantShell.entryPoint?.getDependencyAPIs?.() || []
      return dependencyAPIs.find(
        (key) => getAPIContributor(key)?.name === declaringShell.name
      )
    })
  }

  const executeDetachOnShellReadyForRemoval = (
    shellsToBeDetached: PrivateShell[],
    originalRequestedRemovalNames: string[]
  ) => {
    invokeEntryPointPhase('detach', shellsToBeDetached, (f) =>
      _.invoke(f.entryPoint, 'detach', f)
    )

    const detachedShellsNames = shellsToBeDetached.map(({ name }) => name)

    const slotKeysToDiscard = findContributedAPIs(detachedShellsNames).concat(
      findDeclaredSlotKeys(detachedShellsNames)
    )

    extensionSlots.forEach((extensionSlot) =>
      extensionSlot.discardItemBy((extensionItem) =>
        doesExtensionItemBelongToShells(extensionItem, detachedShellsNames)
      )
    )

    detachedShellsNames.forEach((name) => {
      const isResultOfMissingDependency =
        !originalRequestedRemovalNames.includes(name)
      if (isResultOfMissingDependency) {
        const entryPoint = addedShells.get(name)?.entryPoint
        entryPoint && unReadyEntryPointsStore.get().push(entryPoint)
      }
      addedShells.delete(name)
      uniqueShellNames.delete(name)
    })

    slotKeysToDiscard.forEach(discardSlotKey)
  }

  const findContributedAPIs = (shellNames: string[]) => {
    return [...readyAPIs].filter((APIKey) =>
      _.includes(shellNames, _.get(getAPIContributor(APIKey), 'name'))
    )
  }

  const findDeclaredSlotKeys = (shellNames: string[]) => {
    const shellNameSet = new Set<string>(shellNames)
    const result: SlotKey[] = []
    for (const entry of extensionSlots.entries()) {
      const { declaringShell } = entry[1]
      if (declaringShell && shellNameSet.has(declaringShell.name)) {
        result.push(entry[0])
      }
    }
    return result
  }

  const doesExtensionItemBelongToShells = (
    extensionItem: ExtensionItem<any>,
    shellNames: string[]
  ) => {
    return (
      _.includes(shellNames, extensionItem.shell.name) ||
      _.some(
        _.invoke(
          (extensionItem.shell as PrivateShell).entryPoint,
          'getDependencyAPIs'
        ),
        (APIKey) =>
          _.includes(shellNames, _.get(getAPIContributor(APIKey), 'name'))
      )
    )
  }

  const discardSlotKey = (key: SlotKey) => {
    const ownKey = getOwnSlotKey(key)
    readyAPIs.delete(ownKey)
    extensionSlots.delete(ownKey)
    slotKeysByName.delete(slotKeyToName(ownKey))
  }

  const findDependantShells = (shell: PrivateShell) => {
    const cache = new Map<string, PrivateShell[]>()

    const _findDependantShells = (
      declaringShell: PrivateShell
    ): PrivateShell[] =>
      _([...addedShells.entries()])
        .flatMap(([name, shell]) => {
          const cachedValue = cache.get(name)
          if (cachedValue) {
            return cachedValue
          }
          const dependencyAPIs = shell.entryPoint?.getDependencyAPIs?.() || []
          const isDependant = dependencyAPIs.some(
            (key) => getAPIContributor(key)?.name === declaringShell.name
          )
          if (!isDependant) {
            return []
          }
          const dependencies = [shell, ..._findDependantShells(shell)]
          cache.set(name, dependencies)
          return dependencies
        })
        .uniqBy('name')
        .value()

    return _findDependantShells(shell)
  }

  const declareSlot = <T>(
    key: SlotKey<T>,
    declaringShell?: PrivateShell
  ): ExtensionSlot<T> => {
    const newSlot = registerSlotOrThrow(key, () =>
      createExtensionSlot(key, declaringShell)
    )
    return newSlot
  }

  const slotKeyToName = (key: SlotKey) => {
    return key.version === undefined ? key.name : `${key.name}(v${key.version})`
  }

  const registerSlotOrThrow = <TItem, TSlot extends ExtensionSlot>(
    key: SlotKey<TItem>,
    factory: () => TSlot
  ): TSlot => {
    const slotName = slotKeyToName(key)
    if (!extensionSlots.has(key) && !slotKeysByName.has(slotName)) {
      const newSlot = factory()

      extensionSlots.set(key, newSlot)
      slotKeysByName.set(slotName, key)

      return newSlot
    }
    throw new Error(`Extension slot with key '${slotName}' already exists.`)
  }

  const getSlot = <T>(key: SlotKey<T>): ExtensionSlot<T> => {
    const ownKey = getOwnSlotKey(key)
    const anySlot = extensionSlots.get(ownKey)
    if (anySlot) {
      return anySlot as ExtensionSlot<T>
    }
    throw new Error(
      `Extension slot with key '${slotKeyToName(key)}' doesn't exist.`
    )
  }

  const getAPI = <T>(key: SlotKey<T>): T => {
    const APISlot = getSlot<T>(key)
    const item = APISlot.getSingleItem()
    if (item) {
      return item.contribution
    }
    throw new Error(`API '${slotKeyToName(key)}' doesn't exist.`)
  }

  const getAPIContributor = (key: SlotKey) => {
    const ownKey = getOwnSlotKey(key)
    return extensionSlots.has(ownKey)
      ? getSlot(ownKey).getSingleItem()?.shell
      : undefined
  }

  const getOwnSlotKey = <T>(key: SlotKey<T>): SlotKey<T> => {
    if (key.public === true) {
      const ownKey = slotKeysByName.get(slotKeyToName(key))
      if (ownKey && ownKey.public) {
        return ownKey as SlotKey<T>
      }
    }
    return key
  }

  const getAllSlotKeys = () => {
    return Array.from(extensionSlots.keys())
  }

  const hasShell = (name: string) => {
    return addedShells.has(name)
  }

  const getLayerByName = (layerName: string) => {
    const layer = _(layers).flatten().find({ name: layerName })
    if (!layer) {
      throw new Error(`Cannot find layer ${layerName}`)
    }
    return layer
  }

  const createShell = (entryPoint: EntryPoint) => {
    let APIsEnabled = false
    let wasInitCompleted = false

    let dependencyAPIs: APIKey[] = []

    const isOwnContributedAPI = (key: SlotKey) =>
      getAPIContributor(key) === shell

    const shell = {
      name: entryPoint.name,
      entryPoint,

      initialize: () => {
        if (wasInitCompleted) {
          return
        }
        APIsEnabled = false

        invokeEntryPointPhase('getDependencyAPIs', [shell], (f) => {
          if (f.entryPoint.getDependencyAPIs) {
            dependencyAPIs = f.entryPoint.getDependencyAPIs()
          }
        })

        invokeEntryPointPhase('attach', [shell], (f) =>
          f.entryPoint.attach?.(f)
        )

        APIsEnabled = true

        invokeEntryPointPhase('extend', [shell], (f) =>
          f.entryPoint.extend?.(f)
        )

        addedShells.set(shell.entryPoint.name, shell)
        wasInitCompleted = true
      },

      addShells(entryPointsOrPackages: EntryPointOrPackage[]) {
        const shellNamesToBeinstalled = _.flatten(entryPointsOrPackages).map(
          (x) => x.name
        )
        const shellNamesInstalledByCurrentEntryPoint =
          shellInstallers.get(shell) || []
        shellInstallers.set(shell, [
          ...shellNamesInstalledByCurrentEntryPoint,
          ...shellNamesToBeinstalled
        ])
        return addShells(entryPointsOrPackages)
      },

      removeShells(names: string[]) {
        const namesInstalledByCurrentEntryPoint =
          shellInstallers.get(shell) || []
        const namesNotInstalledByCurrentEntryPoint = _.difference(
          names,
          namesInstalledByCurrentEntryPoint
        )
        if (!_.isEmpty(namesNotInstalledByCurrentEntryPoint)) {
          throw new Error(
            `Shell ${entryPoint.name} is trying to uninstall shells: ${names} which is are not installed by entry point ${entryPoint.name} - This is not allowed`
          )
        }
        shellInstallers.set(
          shell,
          _.without(namesInstalledByCurrentEntryPoint, ...names)
        )
        return removeShells(names)
      },

      hasSlot: <T>(key: SlotKey<T>): boolean => {
        const slot = getSlot(key)
        const { declaringShell } = slot
        return Boolean(declaringShell && declaringShell !== shell)
      },
      declareSlot: <T>(key: SlotKey<T>): ExtensionSlot<T> => {
        return declareSlot<T>(key, shell)
      },
      getSlot: <T>(key: SlotKey<T>): ExtensionSlot<T> => {
        const slot = getSlot(key)
        const { declaringShell } = slot
        if (!declaringShell || declaringShell !== shell) {
          throw new Error(
            `PrivateShell '${
              shell.name
            }' is trying to get slot '${slotKeyToName(
              key
            )}' that is owned by '${
              declaringShell ? declaringShell.name : 'Host'
            }'`
          )
        }
        return slot
      },

      getAPI: <T>(key: SlotKey<T>): T => {
        if (dependencyAPIs.indexOf(key) >= 0 || isOwnContributedAPI(key)) {
          return host.getAPI(key)
        }
        throw new Error(
          `API '${slotKeyToName(
            key
          )}' is not declared as dependency by entry point '${
            entryPoint.name
          }' (forgot to return it from getDependencyAPIs?)`
        )
      },
      contributeAPI: <T>(key: SlotKey<T>, factory: () => T) => {
        if (!_.includes(_.invoke(entryPoint, 'declareAPIs') || [], key)) {
          throw new Error(
            `Entry point '${
              entryPoint.name
            }' is trying to contribute API '${slotKeyToName(
              key
            )}' which it didn't declare`
          )
        }

        if (
          !options.disableLayersValidation &&
          (entryPoint.layer || key.layer) &&
          !areSameLayers(entryPoint.layer, key.layer)
        ) {
          throw new Error(
            `Cannot contribute API ${slotKeyToName(key)} of layer ${
              key.layer || '<BLANK>'
            } from entry point ${entryPoint.name} of layer ${
              entryPoint.layer || '<BLANK>'
            }`
          )
        }

        const api = factory()
        const apiSlot = declareSlot<T>(key)

        APILayers.set(
          key,
          !options.disableLayersValidation && entryPoint.layer
            ? _(entryPoint.layer)
                .castArray()
                .map((l) => getLayerByName(l))
                .value()
            : undefined
        )
        apiSlot.contribute(shell, api)
        readyAPIs.add(key)

        if (canInstallReadyEntryPoints) {
          executeInstallShell(unReadyEntryPointsStore.get())
        }

        return api
      },

      canUseAPIs() {
        return APIsEnabled
      },
      wasInitializationCompleted() {
        return wasInitCompleted
      }
    }

    return shell
  }

  const host = {
    getAPI,
    getSlot,
    getAllSlotKeys,
    hasShell,
    addShells,
    removeShells,
    options
  }

  addShells(initialEntryPointsOrPackages)

  return host
}
