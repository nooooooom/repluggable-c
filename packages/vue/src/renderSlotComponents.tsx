import type { ExtensionItem, ExtensionSlot, Shell } from '@repluggable-c/core'
import {
  defineComponent,
  h as _h,
  InjectionKey,
  isVue2,
  onUnmounted,
  provide,
  ref,
  Ref,
  toRef
} from 'vue-demi'
import * as Vue from 'vue'
import type { PropType, ExtractPropTypes } from 'vue-demi'
import _ from 'lodash'
import { renderWithAspects } from './shellBoundaryAspect'
import type { Container, VueNode } from './shellBoundaryAspect'
import { isReactiveSlot, ReactiveSlot } from './reactiveSlot'

export const ShellInjectionKey = Symbol('ShellInjectionKey') as InjectionKey<{
  shellRef: Ref<Shell>
}>

export const ShellRenderer = defineComponent({
  props: {
    shell: {
      type: Object as PropType<Shell>,
      required: true
    },
    component: Object as PropType<VueNode>
  },
  setup(props) {
    provide(ShellInjectionKey, {
      shellRef: toRef(props, 'shell')
    })
  },
  render() {
    return renderWithAspects(this.shell, this.component as VueNode, 0)
  }
})

const createFragment = (container?: Container): Container => {
  return (isVue2 ? container || 'div' : Vue.Fragment) as Container
}

export const useExtensionSlotItems = (
  slot: ExtensionSlot<any> | ReactiveSlot<any>
) => {
  if (isReactiveSlot(slot)) {
    return slot.getComputedItems()
  }

  const itemsRef = ref(slot.getItems())

  const handleItemChange = () => {
    itemsRef.value = slot.getItems()
  }
  slot.onItemsChanged(handleItemChange)

  onUnmounted(() => slot.removeItemsChangedCallback(handleItemChange))

  return itemsRef
}

export type VueComponentContributor = () => VueNode

const slotRendererProps = {
  extensionSlot: {
    type: Object as PropType<ExtensionSlot<any>>,
    required: true
  },
  container: [String, Object, Function] as PropType<Container>,
  containerProps: Object as PropType<Record<string, any>>,
  mapFunc: Function as PropType<
    (item: any, index: number) => VueComponentContributor
  >,
  filterFunc: Function as PropType<(item: any, index: number) => boolean>,
  sortFunc: Function as PropType<
    (itemA: ExtensionItem<any>, itemB: ExtensionItem<any>) => number
  >
} as const

export type SlotRendererProps = ExtractPropTypes<typeof slotRendererProps>

export const SlotRenderer = defineComponent({
  props: slotRendererProps,
  setup(props) {
    return {
      items: useExtensionSlotItems(props.extensionSlot)
    }
  },
  render() {
    const { mapFunc, filterFunc, sortFunc, items } = this
    const children = _.flow(
      _.compact([
        filterFunc &&
          ((slotItems: typeof items) =>
            slotItems.filter((item, index) =>
              filterFunc(item.contribution, index)
            )),
        sortFunc && ((slotItems: typeof items) => slotItems.sort(sortFunc)),
        (slotItems: typeof items) =>
          slotItems.map(createSlotItemToShellRendererMap(mapFunc))
      ])
    )(items)

    if (children <= 1 && !this.container) {
      return children[0]
    }

    const Container = createFragment(this.container)
    return _h(
      Container,
      {
        ...this.containerProps
      },
      children
    )
  }
})

function createSlotItemToShellRendererMap<T = any>(
  mapFunc?: SlotRendererProps['mapFunc']
) {
  return (item: ExtensionItem<T>, index: number) => {
    const predicateResult = item.condition()
    const render = (
      mapFunc ? mapFunc(item.contribution, index) : item.contribution
    ) as VueComponentContributor
    return (
      <ShellRenderer
        shell={item.shell}
        component={predicateResult ? render() : null}
        key={item.uniqueId}
      />
    )
  }
}
