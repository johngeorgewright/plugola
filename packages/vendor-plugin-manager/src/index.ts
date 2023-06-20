import { updateMap } from '@johngw/map'
import {
  PluginManager,
  InitContext,
  StatefulContext,
  Plugin,
  RunContext,
  StatefulPlugin,
} from '@plugola/plugin-manager'
import { BaseActions } from '@plugola/store'
import { MessageBus } from '@plugola/message-bus'

export default class VendorPluginManager<
  MB extends MessageBus,
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>
> extends PluginManager<MB, ExtraContext, ExtraInitContext, ExtraRunContext> {
  #automaticallyAuthorizedPlugins = new Set<string>()
  #vendors: Map<number, string[]> = new Map()

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

  override registerStatefulPlugin<Actions extends BaseActions, State>(
    name: string,
    plugin: Omit<
      StatefulPlugin<
        Actions,
        State,
        InitContext<MB> & ExtraContext & ExtraInitContext,
        StatefulContext<MB, Actions, State> & ExtraContext & ExtraRunContext
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
    this.#relatedPluginAndVendorIds(name, vendorIds)
  }

  registerStatefulVendorPlugin<Actions extends BaseActions, State>(
    name: string,
    vendorIds: number[],
    plugin: Omit<
      StatefulPlugin<
        Actions,
        State,
        InitContext<MB> & ExtraContext & ExtraInitContext,
        StatefulContext<MB, Actions, State> & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ) {
    super.registerStatefulPlugin(name, plugin)
    this.#relatedPluginAndVendorIds(name, vendorIds)
  }

  async enableAuthorizedPlugins(authorizedVendorIds: number[]) {
    await this.enablePlugins([
      ...this.#automaticallyAuthorizedPlugins,
      ...authorizedVendorIds.reduce<string[]>(
        (pluginNames, vendorId) =>
          this.#vendors.has(vendorId)
            ? [...pluginNames, ...this.#vendors.get(vendorId)!]
            : pluginNames,
        []
      ),
    ])
  }

  #relatedPluginAndVendorIds(pluginName: string, vendorIds: number[]) {
    for (const vendorId of vendorIds)
      this.#vendors = updateMap(this.#vendors, vendorId, (pluginNames = []) => [
        ...pluginNames,
        pluginName,
      ])
  }
}
