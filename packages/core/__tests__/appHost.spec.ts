import { describe, it, expect } from 'vitest'
import { createAppHost } from '../src'
import type { SlotKey } from '../src'

describe('App Host', () => {
  it('should create an app host', () => {
    const host = createAppHost([], {})
    expect(host).toBeInstanceOf(Object)
  })

  describe('AppHost Options', () => {
    const layers = [
      {
        name: 'State',
        level: 10
      },
      {
        name: 'UI',
        level: 20
      }
    ]
    const MockUIAPIKey: SlotKey<{}> = {
      name: 'Mock-UI-API-1',
      public: true,
      layer: 'UI'
    }
    const MockStateAPIKey: SlotKey<{}> = {
      name: 'Mock-State-API-1',
      public: true,
      layer: 'State'
    }
    const packages = [
      {
        ...MockStateAPIKey,
        getDependencyAPIs: () => [MockUIAPIKey]
      },
      {
        ...MockUIAPIKey,
        getDependencyAPIs: () => [],
        declareAPIs: () => [MockUIAPIKey]
      }
    ]

    it('should validate the layers', (done) => {
      try {
        const host = createAppHost(packages, {
          layers
        })
        done(Error('should validate the layers'))
      } catch (error) {
        done()
      }
    })

    it('should not validate the layers', (done) => {
      try {
        const host = createAppHost(packages, {
          layers,
          disableLayersValidation: true
        })
        done()
      } catch (error) {
        done(Error('should not validate the layers'))
      }
    })
  })
})
