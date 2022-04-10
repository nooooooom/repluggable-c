import { EntryPoint } from 'repluggable'
import { MainViewAPIKey } from '../main-view/mainViewAPI'
import { HelloWorld } from './components/HelloWorld'
import { Logo } from './components/Logo'

export const ComponentEntryPoint: EntryPoint = {
  name: 'component',
  getDependencyAPIs() {
    return [MainViewAPIKey]
  },
  extend(shell) {
    shell
      .getAPI(MainViewAPIKey)
      .contributeComponent(shell, { component: () => <Logo /> })
    shell.getAPI(MainViewAPIKey).contributeComponent(shell, {
      component: () => <HelloWorld msg="Hello Vue 3 + TypeScript + Vite" />
    })
  }
}
