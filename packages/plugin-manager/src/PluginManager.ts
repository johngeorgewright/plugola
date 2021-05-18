import {
  createInitContext,
  createRunContext,
  isStatefulContext,
} from './Context'
import { Plugin, StatefulPlugin } from './Plugin'
import type { ActionI } from '@plugola/store'

export default class PluginManager {
  private plugins: Record<string, Plugin | StatefulPlugin<any, any>> = {}
  private initialized: Record<string, Promise<void>> = {}
  private ran: Record<string, Promise<void>> = {}

  registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: StatefulPlugin<Action, State>
  ) {
    this.plugins[name] = plugin
  }

  registerPlugin(name: string, plugin: Plugin) {
    this.plugins[name] = plugin
  }

  async init() {
    this.initialized = {}
    await this.mapPlugins(this.initPlugin)
  }

  async run() {
    this.ran = {}
    await this.mapPlugins(this.runPlugin)
  }

  private initPlugin = async (pluginName: string) => {
    const plugin = this.plugins[pluginName]

    if (this.initialized[pluginName]) {
      return
    }

    this.initialized[pluginName] = (async () => {
      if (plugin.dependencies) {
        await this.mapDependencies(
          plugin.dependencies,
          (dep) => !this.initialized[dep],
          this.initPlugin
        )
      }

      if (plugin.init) {
        return plugin.init(createInitContext(pluginName))
      }
    })()

    return this.initialized[pluginName]
  }

  private runPlugin = async (pluginName: string) => {
    const plugin = this.plugins[pluginName]

    if (this.ran[pluginName]) {
      return
    }

    this.ran[pluginName] = (async () => {
      if (plugin.dependencies) {
        await this.mapDependencies(
          plugin.dependencies,
          (dep) => !this.ran[dep],
          this.runPlugin
        )
      }

      if (plugin.run) {
        const context = createRunContext(pluginName, plugin)
        if (isStatefulContext(context)) {
          context.store.init()
        }
        return plugin.run(context as any)
      }
    })()

    return this.ran[pluginName]
  }

  private async mapPlugins(map: (pluginName: string) => Promise<any>) {
    await Promise.all(Object.keys(this.plugins).map(map))
  }

  private async mapDependencies(
    dependencyNames: string[],
    filter: (pluginName: string) => boolean,
    map: (pluginName: string) => Promise<any>
  ) {
    await Promise.all(
      dependencyNames
        .filter((dependency) => {
          if (!this.plugins[dependency]) {
            throw new Error(`Cannot find dependency ${dependency}`)
          }
          return filter(dependency)
        })
        .map(map)
    )
  }
}
