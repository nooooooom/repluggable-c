import { AppMainViewAPIKey } from '@repluggable-c/vue'
import type { EntryPoint } from '@repluggable-c/core'
import { MainView } from './components/MainView'
import {
  componentsSlotKey,
  createMainViewAPI,
  MainViewAPIKey
} from './mainViewAPI'

export const MainViewEntryPoint: EntryPoint = {
  ...MainViewAPIKey,
  getDependencyAPIs() {
    return [AppMainViewAPIKey]
  },
  declareAPIs() {
    return [MainViewAPIKey]
  },
  attach(shell) {
    shell.contributeAPI(MainViewAPIKey, () => createMainViewAPI(shell))
  },
  extend(shell) {
    shell
      .getAPI(AppMainViewAPIKey)
      .contributeMainView(shell, () => (
        <MainView extensionSlot={shell.getSlot(componentsSlotKey)} />
      ))
  }
}
