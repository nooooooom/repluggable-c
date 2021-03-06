import type { VueComponentContributor } from '@repluggable-c/vue'
import type { EntryPoint } from '@repluggable-c/core'
import { MainViewAPIKey } from '../main-view/mainViewAPI'
import { HelloWorld } from './components/HelloWorld'
import { Logo } from './components/Logo'

const components: VueComponentContributor[] = [
  () => <Logo />,
  () => <HelloWorld msg="Hello Vue 3 + TypeScript + Vite" />
]

export const ComponentEntryPoint: EntryPoint = {
  name: 'component',
  getDependencyAPIs() {
    return [MainViewAPIKey]
  },
  extend(shell) {
    components.forEach((component) => {
      shell.getAPI(MainViewAPIKey).contributeComponent(shell, { component })
    })
  }
}
