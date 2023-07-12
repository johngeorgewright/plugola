import { updateMap } from '@johngw/map'
import {
  PluginManager,
  InitContext,
  Plugin,
  RunContext,
} from '@plugola/plugin-manager'

export default class VendorPluginManager<
  ExtraContext extends Record<string, unknown>,
  ExtraInitContext extends Record<string, unknown>,
  ExtraRunContext extends Record<string, unknown>
> extends PluginManager<ExtraContext, ExtraInitContext, ExtraRunContext> {
  #automaticallyAuthorizedPlugins = new Set<string>()
  #vendors: Map<number, string[]> = new Map()

  override registerPlugin(
    plugin: Plugin<
      InitContext & ExtraContext & ExtraInitContext,
      RunContext & ExtraContext & ExtraRunContext
    >
  ): void

  override registerPlugin(
    name: string,
    plugin: Omit<
      Plugin<
        InitContext & ExtraContext & ExtraInitContext,
        RunContext & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ): void

  override registerPlugin(
    nameOrPlugin:
      | string
      | Plugin<
          InitContext & ExtraContext & ExtraInitContext,
          RunContext & ExtraContext & ExtraRunContext
        >,
    plugin?: Omit<
      Plugin<
        InitContext & ExtraContext & ExtraInitContext,
        RunContext & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ) {
    super.registerPlugin(
      nameOrPlugin as string,
      plugin as Omit<
        Plugin<
          InitContext & ExtraContext & ExtraInitContext,
          RunContext & ExtraContext & ExtraRunContext
        >,
        'name'
      >
    )

    const name = plugin
      ? (nameOrPlugin as string)
      : (
          nameOrPlugin as Plugin<
            InitContext & ExtraContext & ExtraInitContext,
            RunContext & ExtraContext & ExtraRunContext
          >
        ).name

    this.#automaticallyAuthorizedPlugins.add(name)
  }

  registerVendorPlugin(
    name: string,
    vendorIds: number[],
    plugin: Omit<
      Plugin<
        InitContext & ExtraContext & ExtraInitContext,
        RunContext & ExtraContext & ExtraRunContext
      >,
      'name'
    >
  ) {
    super.registerPlugin(name, plugin)
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
