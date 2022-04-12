import type { Shell, SlotKey } from '@repluggable-c/core'
import { h } from 'vue-demi'
import type { VNode } from 'vue-demi'

export type Container = Parameters<typeof h>[0]
export type VueNode = VNode | null

export const BoundaryAspectsSlotKey: SlotKey<Container> = {
  name: 'BoundaryAspects',
  public: true
}

export const renderWithAspects = (
  shell: Shell,
  component: VueNode,
  aspectIndex: number
): VueNode => {
  const aspects = shell.getSchrodingerSlot(BoundaryAspectsSlotKey)?.getItems()

  if (aspects && aspects.length > aspectIndex) {
    const Aspect = aspects[aspectIndex]
    return h(Aspect, [renderWithAspects(shell, component, aspectIndex + 1)])
  }

  return component
}
