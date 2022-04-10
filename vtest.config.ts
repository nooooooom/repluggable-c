import { resolve } from 'path'
import { defineConfig } from 'vite'

const r = (p: string) => resolve(__dirname, p)

export default defineConfig({
  resolve: {
    alias: {
      repluggable: r('./packages/core/src/index.ts'),
      '@repluggable/core': r('./packages/core/src/index.ts'),
      '@repluggable/vue': r('./packages/vue/src/index.ts')
    }
  },
  test: {}
})
