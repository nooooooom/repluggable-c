import { resolve } from 'path'
import { defineConfig } from 'vite'

const r = (p: string) => resolve(__dirname, p)

export default defineConfig({
  resolve: {
    alias: {
      '@repluggable-c/core': r('./packages/core/src/index.ts'),
      '@repluggable-c/vue': r('./packages/vue/src/index.ts')
    }
  },
  test: {}
})
