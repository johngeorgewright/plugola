import type { BaseActions, Reducers } from '@plugola/store'

export function isStatefulPlugin(plugin: any): plugin is StatefulPlugin<any> {
  return !!plugin.state
}

export interface Plugin<
  IC extends Record<string, unknown> = any,
  RC extends Record<string, unknown> = any
> {
  name: string
  dependencies?: string[]
  initTimeout?: number
  init?(context: IC): any
  run?(context: RC): any
}

export interface StatefulPlugin<
  Actions extends BaseActions = BaseActions,
  State = unknown,
  IC extends Record<string, unknown> = {},
  RC extends Record<string, unknown> = {}
> extends Plugin<IC, RC> {
  state: PluginState<Actions, State, RC>
}

export interface PluginState<
  Actions extends BaseActions,
  State,
  Context extends Record<string, unknown>
> {
  initial: State
  reducers: Reducers<Actions, State>
  onUpdate?<Action extends keyof Actions>(
    action: Action,
    param: Actions[Action],
    state: State,
    context: Context
  ): any
}
