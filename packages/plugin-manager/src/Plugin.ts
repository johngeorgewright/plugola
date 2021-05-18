import type { Context, InitContext, StatefulContext } from './Context'
import type { ActionI } from '@plugola/store'

export function isStatefulPlugin(
  plugin: any
): plugin is StatefulPlugin<any, any> {
  return !!plugin.state
}

export interface Plugin {
  dependencies?: string[]
  init?(context: InitContext): any
  run?(context: Context): any
}

export interface StatefulPlugin<Action extends ActionI, State> extends Plugin {
  run?(context: StatefulContext<Action, State>): any
  state: PluginState<Action, State>
}

export interface PluginState<Action extends ActionI, State> {
  initial: State
  reduce(action: Action, state: State): State
  onUpdate(
    action: Action,
    state: State,
    context: StatefulContext<Action, State>
  ): any
}
