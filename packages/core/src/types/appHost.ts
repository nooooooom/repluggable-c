import {
  CustomExtensionSlot,
  CustomExtensionSlotHandler,
  ExtensionSlot
} from './extensionSlot'

export interface APIKey {
  readonly name: string
  readonly public?: boolean
  readonly version?: number
}

/**
 * A key that represents an {ExtensionSlot} of shape T that's held in the {AppHost}
 * Created be calling {Shell.declareSlot}
 * Retrieved by calling {Shell.getSlot} (scoped to specific {Shell})
 *
 * @export
 * @interface SlotKey
 * @extends {AnySlotKey}
 * @template T
 */
export interface SlotKey<T = any> extends APIKey {
  /**
   * Application layer/layers that will restrict usage of APIs contributed by this entry point.
   * Layers hierarchy is defined in the host options
   * @See {AppHostOptions.layers}
   */
  readonly layer?: string | string[]
}

export interface EntryPoint {
  /**
   * Unique name that will represent this entry point in the host
   */
  readonly name: string
  /**
   * Application layer / layers that will restrict usage of APIs contributed by this entry point.
   * Layers hierarchy is defined in the host options
   * See {AppHostOptions.layers}
   */
  readonly layer?: string | string[]

  /**
   * Define which API keys (a.k.a. contracts) are mandatory for this entry point to be executed
   * @return {SlotKey<any>[]} API keys to wait for implementation
   */
  getDependencyAPIs?(): SlotKey<any>[]
  /**
   * Define which API keys (a.k.a. contracts) this entry point is going to implement and contribute
   * @return {SlotKey<any>[]} API keys that will be contributed
   */
  declareAPIs?(): SlotKey<any>[]
  /**
   * Execute logic that is independent from other entry points
   * Most commonly - contribute APIs
   * @param {Shell} shell
   */
  attach?(shell: Shell): void
  /**
   * Execute logic that is dependent on other entry points
   * @param {Shell} shell
   */
  extend?(shell: Shell): void
  /**
   * Clean side effects
   * @param {Shell} shell
   */
  detach?(shell: Shell): void
}
export type EntryPointOrPackage = EntryPoint | EntryPoint[]
export interface EntryPointOrPackagesMap {
  [name: string]: EntryPointOrPackage
}

export interface APILayer {
  level: number
  name: string
}

export interface AppHostOptions {
  readonly layers?: APILayer[] | APILayer[][]
  readonly disableLayersValidation?: boolean
}

/**
 * An application content container that will accept {EntryPoint} and provide registry for contracts
 *
 * @export
 * @interface AppHost
 */
export interface AppHost {
  /**
   * Get an implementation of API previously contributed to the {AppHost}
   *
   * @template T
   * @param {SlotKey<T>} key API Key
   * @return {*}  {T}
   */
  getAPI<T>(key: SlotKey<T>): T
  /**
   * Get an extension slot defined on the host
   *
   * @template TItem
   * @param {SlotKey<TItem>} key
   * @return {ExtensionSlot<TItem>}
   */
  getSlot<TItem>(key: SlotKey<TItem>): ExtensionSlot<TItem>
  /**
   * Get all the extension slots defined on the host
   *
   * @return {*}  {AnySlotKey[]}
   */
  getAllSlotKeys(): SlotKey[]
  /**
   * Does the {AppHost} contain a specific {Shell}
   *
   * @param {string} name
   * @return {boolean}
   */
  hasShell(name: string): boolean
  /**
   * Dynamically add {Shell}s after the host is created
   *
   * @param {EntryPointOrPackage[]} entryPointsOrPackages New packages or entry points to be added to the {AppHost}
   * @return {Promise<void>}
   */
  addShells(entryPointsOrPackages: EntryPointOrPackage[]): void
  /**
   * Dynamically remove {Shell}s after the host is created
   *
   * @param {string[]} names {Shell} names to be removed
   * @return {Promise<void>}
   */
  removeShells(names: string[]): void
}

export interface APILayer {
  level: number
  name: string
}

export interface AppHostOptions {
  readonly layers?: APILayer[] | APILayer[][]
  readonly disableLayersValidation?: boolean
  readonly disableCheckCircularDependencies?: boolean
}

export type ContributionPredicate = () => boolean

export interface Shell {
  readonly name: string
  /**
   * Are APIs ready to be requested
   *
   * @return {*}  {boolean}
   */
  canUseAPIs(): boolean
  /**
   * Did the execution of {EntryPoint}s' lifecycle phases (attach, detach) are done
   *
   * @return {*}  {boolean}
   */
  wasInitializationCompleted(): boolean
  /**
   * Get an implementation of API previously contributed to the {AppHost}
   *
   * @template T
   * @param {SlotKey<T>} key API Key
   * @return {*}  {T}
   */
  getAPI<T>(key: SlotKey<T>): T
  /**
   * Get an extension slot defined on the host
   *
   * @template TItem
   * @param {SlotKey<TItem>} key
   * @return {ExtensionSlot<TItem>}
   */
  getSlot<TItem>(key: SlotKey<TItem>): ExtensionSlot<TItem>
  /**
   * Get an extension slot defined on the host
   *
   * @template TItem
   * @param {SlotKey<TItem>} key
   * @return {ExtensionSlot<TItem>}
   */
  getSchrodingerSlot<TItem>(
    key: SlotKey<TItem>
  ): ExtensionSlot<TItem> | undefined
  /**
   * Create an {ExtensionSlot}
   *
   * @template TItem
   * @param {SlotKey<TItem>} key Key that will represent the slot (an will be used for retrieval)
   * @return {ExtensionSlot<TItem>} Actual slot
   */
  declareSlot<TItem>(key: SlotKey<TItem>): ExtensionSlot<TItem>
  declareCustomSlot<TItem>(
    key: SlotKey<TItem>,
    handler: CustomExtensionSlotHandler<TItem>
  ): CustomExtensionSlot<TItem>
  /**
   * Contribute an implementation of an API (a.k.a contract)
   *
   * @template TAPI
   * @param {SlotKey<TAPI>} key API Key that represents an interface TAPI
   * @param {() => TAPI} factory Create an implementation of TAPI
   * @param {ContributeAPIOptions<TAPI>} [options] Contribution options {ContributeAPIOptions}
   * @return {TAPI} Result of the factory execution
   */
  contributeAPI<TAPI>(key: SlotKey<TAPI>, factory: () => TAPI): TAPI
  /**
   * Dynamically add {Shell}s after the host is created
   *
   * @param {EntryPointOrPackage[]} entryPointsOrPackages New packages or entry points to be added to the {AppHost}
   * @return {Promise<void>}
   */
  addShells(entryPointsOrPackages: EntryPointOrPackage[]): void
  /**
   * Dynamically remove {Shell}s after the host is created
   *
   * @param {string[]} names {Shell} names to be removed
   * @return {Promise<void>}
   */
  removeShells(names: string[]): void
}

export interface PrivateShell extends Shell {
  readonly entryPoint: EntryPoint
  initialize(): void
}
