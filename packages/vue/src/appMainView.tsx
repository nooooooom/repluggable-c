import type { AppHost, EntryPoint, Shell, SlotKey } from 'repluggable'
import _ from 'lodash'
import { defineComponent } from 'vue-demi'
import type { PropType } from 'vue-demi'
import { SlotRenderer } from './renderSlotComponents'
import type { VueComponentContributor } from './renderSlotComponents'

export interface AppMainViewAPI {
  contributeMainView(
    fromShell: Shell,
    contribution: VueComponentContributor
  ): void
}

export const AppMainViewAPIKey: SlotKey<AppMainViewAPI> = {
  name: 'AppMainViewAPI',
  public: true
}

const AppMainViewSlotKey: SlotKey<VueComponentContributor> = {
  name: 'AppMainViewSlot'
}

const createAppMainViewAPI = (shell: Shell): AppMainViewAPI => {
  const mainViewSlot = shell.declareSlot(AppMainViewSlotKey)

  return {
    contributeMainView(fromShell, contribution) {
      mainViewSlot.contribute(fromShell, contribution)
    }
  }
}

export const AppMainViewEntryPoint: EntryPoint = {
  ...AppMainViewAPIKey,
  declareAPIs() {
    return [AppMainViewAPIKey]
  },
  attach(shell) {
    shell.contributeAPI(AppMainViewAPIKey, () => createAppMainViewAPI(shell))
  }
}

export interface AppMainViewProps {
  host: AppHost
}

export const AppMainView = defineComponent({
  props: {
    host: {
      type: Object as PropType<AppHost>,
      required: true
    }
  },
  render() {
    return (
      <SlotRenderer
        extensionSlot={this.host.getSlot(AppMainViewSlotKey)}
        mapFunc={_.identity}
      />
    )
  }
})
