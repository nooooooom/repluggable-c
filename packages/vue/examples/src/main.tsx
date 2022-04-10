import { AppMainView, AppMainViewEntryPoint } from '@repluggable/vue'
import { createAppHost } from 'repluggable'
import { createApp, defineComponent } from 'vue-demi'
import { MainViewEntryPoint } from './packages/main-view/mainViewEntry'
import { ComponentEntryPoint } from './packages/component/componentEntry'

import './main.scss'

const host = createAppHost([
  AppMainViewEntryPoint,
  MainViewEntryPoint,
  ComponentEntryPoint
])

createApp(
  defineComponent({
    render() {
      return <AppMainView host={host} />
    }
  })
).mount('#app')
