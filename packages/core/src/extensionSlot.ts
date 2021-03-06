import _ from 'lodash'
import type { Shell, SlotKey } from './types/appHost'
import type {
  CustomExtensionSlot,
  CustomExtensionSlotHandler,
  ExtensionItem,
  ExtensionItemFilter,
  ExtensionItemsChangedCallback,
  ExtensionSlot
} from './types/extensionSlot'

const alwaysTrue = () => true

export function createExtensionSlot<T>(
  key: SlotKey<T>,
  declaringShell?: Shell
): ExtensionSlot<T> {
  const items: ExtensionItem<T>[] = []
  const itemsChangedCallbacks: ExtensionItemsChangedCallback<T>[] = []

  const contribute: ExtensionSlot<T>['contribute'] = (
    fromShell,
    item: T,
    condition
  ) => {
    items.push({
      shell: fromShell,
      contribution: item,
      condition: condition || alwaysTrue,
      uniqueId: _.uniqueId(`${fromShell.name}_extItem_`)
    })
    executeItemsChangedCallbacks()
  }

  const getItems: ExtensionSlot<T>['getItems'] = (
    forceAll: boolean = false
  ) => {
    return forceAll ? items : items.filter((item) => item.condition())
  }

  const getSingleItem: ExtensionSlot<T>['getSingleItem'] = () => {
    return items.find((item) => item.condition())
  }

  const getItemByName: ExtensionSlot<T>['getItemByName'] = (name) => {
    return items.find((item) => item.name === name && item.condition())
  }

  const discardBy: ExtensionSlot<T>['discardBy'] = (
    predicate: ExtensionItemFilter<T>
  ) => {
    _.remove(items, predicate)
    executeItemsChangedCallbacks()
  }

  const executeItemsChangedCallbacks = () => {
    itemsChangedCallbacks.forEach((f) => f(items))
  }

  const onItemsChanged = (callback: ExtensionItemsChangedCallback<T>) => {
    itemsChangedCallbacks.push(callback)
  }

  const removeItemsChangedCallback = (
    callback: ExtensionItemsChangedCallback<T>
  ) => {
    _.remove(itemsChangedCallbacks, (c) => c === callback)
  }

  return {
    name: key.name,
    declaringShell,
    contribute,
    getItems,
    getSingleItem,
    getItemByName,
    discardBy,
    onItemsChanged,
    removeItemsChangedCallback
  }
}

export function createCustomExtensionSlot<
  T,
  Handler extends CustomExtensionSlotHandler<T> = CustomExtensionSlotHandler<T>
>(
  key: SlotKey<T>,
  handler: Handler,
  declaringShell?: Shell
): CustomExtensionSlot<T> & Handler {
  return {
    ...handler,
    name: key.name,
    declaringShell
  }
}
