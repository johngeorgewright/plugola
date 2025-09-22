import type { RunContext, EnableContext } from './Context.js'
import type PluginManager from './PluginManager.js'

export type PluginManagerEnableContext<
  PM extends PluginManager<any, any, any>
> = PM extends PluginManager<infer C, infer IC, any>
  ? EnableContext & C & IC
  : never

export type PluginManagerRunContext<PM extends PluginManager<any, any, any>> =
  PM extends PluginManager<infer C, any, infer RC> ? RunContext & C & RC : never
