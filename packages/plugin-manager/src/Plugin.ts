import type { ActionI, Reducer } from '@plugola/store'

export function isStatefulPlugin(
  plugin: any
): plugin is StatefulPlugin<any, any, any, any> {
  return !!plugin.state
}

export interface Plugin<
  IC extends Record<string, unknown>,
  C extends Record<string, unknown>
> {
  dependencies?: string[]
  init?(context: IC): any
  run?(context: C): any
}

export interface StatefulPlugin<
  Action extends ActionI,
  State,
  IC extends Record<string, unknown>,
  C extends Record<string, unknown>
> {
  dependencies?: string[]
  init?(context: IC): any
  run?(context: C): any
  state: PluginState<Action, State, C>
}

export interface PluginState<
  Action extends ActionI,
  State,
  Context extends Record<string, unknown>
> {
  initial: State
  reduce: Reducer<Action, State>
  onUpdate(action: Action, state: State, context: Context): any
}
