import {
  createInitContext,
  createRunContext,
  isStatefulContext,
} from './Context'
import type { Plugin, StatefulePlugin } from './Plugin'
import type { ActionI } from '@plugola/store'

export default class PluginManager {
  private plugins: Record<string, Plugin | StatefulePlugin<any, any>> = {}

  registerStatefulPlugin<Action extends ActionI, State>(
    name: string,
    plugin: StatefulePlugin<Action, State>
  ) {
    this.plugins[name] = plugin
  }

  registerPlugin(name: string, plugin: Plugin) {
    this.plugins[name] = plugin
  }

  async init() {
    await this.pAll(([pluginName, plugin]) => {
      if (plugin.init) {
        return plugin.init(createInitContext(pluginName))
      }
    })
  }

  async run() {
    await this.pAll(([pluginName, plugin]) => {
      if (plugin.run) {
        const context = createRunContext(pluginName, plugin)
        if (isStatefulContext(context)) {
          context.store.init()
        }
        return plugin.run(context)
      }
    })
  }

  private async pAll(fn: (entry: [pluginName: string, plugin: Plugin]) => any) {
    await Promise.all(Object.entries(this.plugins).map(fn))
  }
}
