import _ from 'lodash'
import type { EntryPoint, SlotKey } from './types/appHost'

export const dependentAPIs = (entryPoint: EntryPoint): SlotKey[] => {
  return _.chain(entryPoint).invoke('getDependencyAPIs').defaultTo([]).value()
}

export const declaredAPIs = (entryPoint: EntryPoint): SlotKey[] => {
  return _.chain(entryPoint).invoke('declareAPIs').defaultTo([]).value()
}
