import _ from 'lodash'
import {
  AnyExtensionSlot,
  ExtensionItem,
  CustomExtensionSlotHandler
} from 'repluggable'
import { ref, computed } from 'vue-demi'
import type { ComputedRef, Ref } from 'vue-demi'

export interface ReactiveSlotHandler<T> extends CustomExtensionSlotHandler<T> {
  readonly __isReactiveSlot: true
  getItems(): ExtensionItem<T>[]
  getComputedItems(): ComputedRef<ExtensionItem<T>[]>
}

export type ReactiveSlot<T> = AnyExtensionSlot & ReactiveSlotHandler<T>

export const isReactiveSlot = (slot: any): slot is ReactiveSlotHandler<any> =>
  Boolean(slot && slot.__isReactiveSlot)

const alwaysTrue = () => true

export function createReactiveSlotHandler<T>(): ReactiveSlotHandler<T> {
  const itemsRef = ref([]) as Ref<ExtensionItem<T>[]>

  return {
    __isReactiveSlot: true,
    contribute: (fromShell, item, condition) => {
      itemsRef.value.push({
        shell: fromShell,
        contribution: item,
        condition: condition || alwaysTrue,
        uniqueId: _.uniqueId(`${fromShell.name}_extItem_`)
      })
    },
    discardBy: (predicate) => {
      itemsRef.value = _.filter(itemsRef.value, predicate)
    },
    getItems: () => itemsRef.value,
    getComputedItems: () => computed(() => itemsRef.value)
  }
}
