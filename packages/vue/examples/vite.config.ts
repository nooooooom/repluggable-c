import { mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJSX from '@vitejs/plugin-vue-jsx'
import baseConfig from '../../../vtest.config'

export default mergeConfig(baseConfig, {
  plugins: [vue(), vueJSX()],
  optimizeDeps: {
    exclude: ['vue-demi']
  }
})
