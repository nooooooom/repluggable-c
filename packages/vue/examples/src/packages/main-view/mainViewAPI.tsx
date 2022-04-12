import type { Shell, SlotKey } from 'repluggable'
import { createReactiveSlotHandler } from '@repluggable-c/vue'
import type { VueComponentContributor } from '@repluggable-c/vue'

export interface ContributedComponent {
  component: VueComponentContributor
}

export const componentsSlotKey: SlotKey<ContributedComponent> = {
  name: 'contributedComponent'
}

export interface MainViewAPI {
  contributeComponent(
    fromShell: Shell,
    contribution: ContributedComponent
  ): void
}

export const MainViewAPIKey: SlotKey<MainViewAPI> = {
  name: 'mainViewAPI',
  public: true
}

export const createMainViewAPI = (shell: Shell): MainViewAPI => {
  const componentsSlot = shell.declareCustomSlot(
    componentsSlotKey,
    createReactiveSlotHandler()
  )

  return {
    contributeComponent(fromShell, contribution) {
      componentsSlot.contribute(fromShell, contribution)
    }
  }
}
