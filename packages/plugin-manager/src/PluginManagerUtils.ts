import type { BaseActions } from '@plugola/store'
import type { RunContext, InitContext, StatefulContext } from './Context'
import type { StatefulPlugin } from './Plugin'
import type PluginManager from './PluginManager'

export type PluginManagerMessageBus<
  PM extends PluginManager<any, any, any, any>
> = PM extends PluginManager<infer MB, any, any, any> ? MB : never

export type PluginManagerInitContext<
  PM extends PluginManager<any, any, any, any>
> = PM extends PluginManager<infer MB, infer C, infer IC, any>
  ? InitContext<MB> & C & IC
  : never

export type PluginManagerRunContext<
  PM extends PluginManager<any, any, any, any>
> = PM extends PluginManager<infer MB, infer C, any, infer RC>
  ? RunContext<MB> & C & RC
  : never

export type PluginManagerStatefulContext<
  PM extends PluginManager<any, any, any, any>,
  Actions extends BaseActions,
  State
> = PM extends PluginManager<infer MB, infer C, any, infer RC>
  ? StatefulContext<MB, Actions, State> & C & RC
  : never

export type PluginManagerStatefulPlugin<
  PM extends PluginManager<any, any, any, any>,
  Actions extends BaseActions,
  State
> = PM extends PluginManager<infer MB, infer C, infer IC, infer RC>
  ? StatefulPlugin<
      Actions,
      State,
      InitContext<MB> & C & IC,
      StatefulContext<MB, Actions, State> & C & RC
    >
  : never
