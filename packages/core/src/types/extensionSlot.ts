import { ContributionPredicate, Shell } from './appHost'

export type ExtensionItemFilter<T> = (
  extensionItem: ExtensionItem<T>
) => boolean

export type ExtensionItemsChangedCallback<T> = (
  extensionItems: ExtensionItem<T>[]
) => void

/**
 * A slot/container for holding any contribution of shape T
 * Access to the slot is scoped to the {Shell}
 *
 * @export
 * @interface ExtensionSlot
 * @template T
 */
export interface ExtensionSlot<T = any> {
  /**
   * a unique identifier for the slot
   */
  readonly name: string
  /**
   * Which {Shell} owns this slot
   */
  readonly declaringShell?: Shell
  /**
   * Add an item to the slot
   *
   * @param {Shell} shell Who owns the contributed item
   * @param {T} item Extension item to be added to the slot
   * @param {ContributionPredicate} [condition] A predicate to condition the retrieval of the item when slot items are requested with {ExtensionSlot<T>.getItems}
   */
  contribute(shell: Shell, item: T, condition?: ContributionPredicate): void
  /**
   * Get all items contributed to the slot
   *
   * @param {boolean} [forceAll] Ignore items' contribution predicates and get all anyway
   * @return {ExtensionItem<T>[]} All items contributed to the slot
   */
  getItems(forceAll?: boolean): ExtensionItem<T>[]
  /**
   * Get the first item in the slot
   *
   * @return {ExtensionItem<T>} The first item in the slot
   */
  getSingleItem(): ExtensionItem<T> | undefined
  /**
   * Get a specific item in the slot
   *
   * @param {string} name Extension item name
   * @return {ExtensionItem<T> | undefined} Extension item
   */
  getItemByName(name: string): ExtensionItem<T> | undefined
  /**
   * Remove items from the slot by predicate
   *
   * @param {ExtensionItemFilter<T> | undefined} predicate Remove all items matching this predicate
   */
  discardItemBy(predicate: ExtensionItemFilter<T>): void
  onItemsChanged(callback: ExtensionItemsChangedCallback<T>): void
  removeItemsChangedCallback(callback: ExtensionItemsChangedCallback<T>): void
}

/**
 * Item of shape T that is contributed to a slot of shape T
 *
 * @export
 * @interface ExtensionItem
 * @template T
 */
export interface ExtensionItem<T> {
  readonly name?: string
  /**
   * Which {Shell} owns this item
   */
  readonly shell: Shell
  /**
   * Contribution content
   */
  readonly contribution: T
  /**
   * Condition for the retrieval of this item by {ExtensionSlot<T>.getItems}
   */
  readonly condition: ContributionPredicate
  readonly uniqueId: string
}
