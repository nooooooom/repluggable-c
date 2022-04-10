import { AppMainViewAPIKey } from '@repluggable/vue'
import { EntryPoint } from 'repluggable'
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
