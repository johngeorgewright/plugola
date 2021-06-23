import type { ActionI, InitAction, Reducer } from '@plugola/store'

export function isStatefulPlugin(
  plugin: any
): plugin is StatefulPlugin<any, any, any, any> {
  return !!plugin.state
}

export interface Plugin<
  IC extends Record<string, unknown> = any,
  C extends Record<string, unknown> = any
> {
  name: string
  dependencies?: string[]
  initTimeout?: number
  init?(context: IC): any
  run?(context: C): any
}

export interface StatefulPlugin<
  Action extends ActionI = InitAction,
  State = unknown,
  IC extends Record<string, unknown> = any,
  C extends Record<string, unknown> = any
> extends Plugin<IC, C> {
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
