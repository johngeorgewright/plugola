import type { ActionI } from '@plugola/store'
import type { RunContext, InitContext, StatefulContext } from './Context'
import type { StatefulPlugin } from './Plugin'
import type PluginManager from './PluginManager'

export type PluginManagerMessageBus<PM extends PluginManager> =
  PM extends PluginManager<infer MB> ? MB : never

export type PluginManagerInitContext<PM extends PluginManager> =
  PM extends PluginManager<infer MB, infer C, infer IC>
    ? InitContext<MB> & C & IC
    : never

export type PluginManagerRunContext<PM extends PluginManager> =
  PM extends PluginManager<infer MB, infer C, any, infer RC>
    ? RunContext<MB> & C & RC
    : never

export type PluginManagerStatefulContext<
  PM extends PluginManager,
  Action extends ActionI,
  State
> = PM extends PluginManager<infer MB, infer C, any, infer RC>
  ? StatefulContext<MB, Action, State> & C & RC
  : never

export type PluginManagerStatefulPlugin<
  PM extends PluginManager,
  Action extends ActionI,
  State
> = PM extends PluginManager<infer MB, infer C, infer IC, infer RC>
  ? StatefulPlugin<
      Action,
      State,
      InitContext<MB> & C & IC,
      StatefulContext<MB, Action, State> & C & RC
    >
  : never
