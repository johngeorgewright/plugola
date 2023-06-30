import type { RunContext, InitContext } from './Context'
import type PluginManager from './PluginManager'

export type PluginManagerInitContext<PM extends PluginManager<any, any, any>> =
  PM extends PluginManager<infer C, infer IC, any>
    ? InitContext & C & IC
    : never

export type PluginManagerRunContext<PM extends PluginManager<any, any, any>> =
  PM extends PluginManager<infer C, any, infer RC> ? RunContext & C & RC : never
