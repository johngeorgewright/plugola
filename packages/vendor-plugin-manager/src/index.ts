import {
  PluginManager,
  InitContext,
  StatefulContext,
  Plugin,
  RunContext,
  StatefulPlugin,
} from '@plugola/plugin-manager'
import type { ActionI } from '@plugola/store'
import { MessageBus } from '@plugola/message-bus'

export default class VendorPluginManager<
  MB extends MessageBus,
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>
> extends PluginManager<MB, ExtraContext, ExtraInitContext, ExtraRunContext> {
  #automaticallyAuthorizedPlugins = new Set<string>()
  #vendors: Map<number, string> = new Map()

  override registerPlugin(
    name: string,
    plugin: Omit<
      Plugin<
        InitContext<MB> & ExtraContext & ExtraInitContext,
        RunContext<MB> & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ) {
    super.registerPlugin(name, plugin)
    this.#automaticallyAuthorizedPlugins.add(name)
  }

  override registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: Omit<
      StatefulPlugin<
        Action,
        State,
        InitContext<MB> & ExtraContext & ExtraInitContext,
        StatefulContext<MB, Action, State> & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ) {
    super.registerStatefulPlugin(name, plugin)
    this.#automaticallyAuthorizedPlugins.add(name)
  }

  registerVendorPlugin(
    name: string,
    vendorIds: number[],
    plugin: Omit<
      Plugin<
        InitContext<MB> & ExtraContext & ExtraInitContext,
        RunContext<MB> & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ) {
    super.registerPlugin(name, plugin)
    for (const vendorId of vendorIds) this.#vendors.set(vendorId, name)
  }

  async enableAuthorizedPlugins(authorizedVendorIds: number[]) {
    await this.enablePlugins([...this.#automaticallyAuthorizedPlugins])
    await this.enablePlugins(
      authorizedVendorIds.reduce<string[]>(
        (pluginNames, vendorId) =>
          this.#vendors.has(vendorId)
            ? [...pluginNames, this.#vendors.get(vendorId)!]
            : pluginNames,
        []
      )
    )
  }
}
