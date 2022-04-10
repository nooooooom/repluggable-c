import { EntryPoint } from 'repluggable'
import { MainViewAPIKey } from '../main-view/mainViewAPI'
import { HelloWorld } from './components/HelloWorld'

export const HelloWorldEntryPoint: EntryPoint = {
  name: 'helloWorld',
  getDependencyAPIs() {
    return [MainViewAPIKey]
  },
  extend(shell) {
    shell
      .getAPI(MainViewAPIKey)
      .contributeComponent(shell, { component: () => <HelloWorld /> })
  }
}
