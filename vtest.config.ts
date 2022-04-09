import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const r = (p: string) => resolve(__dirname, p)

export default defineConfig({
  resolve: {
    alias: {
      repluggable: r('./packages/core/src/index.ts')
    }
  },
  test: {}
})
