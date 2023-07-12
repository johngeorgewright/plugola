import { PluginManager } from '@plugola/plugin-manager'
import { TestPlugin } from './TestPlugin'

export function testPlugin<
  TestContext extends Record<string, unknown>,
  PluginContext extends Record<string, unknown>,
  InitContext extends Record<string, unknown>,
  RunContext extends Record<string, unknown>
>(testPlugin: TestPlugin<TestContext, PluginContext, InitContext, RunContext>) {
  for (const [testName, plugins] of Object.entries(testPlugin.tests)) {
    describe(testName, () => {
      let testContext: TestContext | undefined

      let pluginManager: PluginManager<
        TestContext & PluginContext,
        InitContext,
        RunContext
      >

      beforeAll(() => {
        testContext = testPlugin.testContext?.()

        pluginManager = new PluginManager({
          addContext(pluginName) {
            return {
              ...testContext,
              ...testPlugin.pluginContext?.(pluginName),
            }
          },
          addInitContext: testPlugin.initContext,
          addRunContext: testPlugin.runContext,
        })

        for (const plugin of plugins) pluginManager.registerPlugin(plugin)
      })

      afterAll(() => pluginManager.disableAllPlugins())

      test('init', () => pluginManager.enableAllPlugins())

      test('run', async () => {
        const p = pluginManager.run()
        await testPlugin.afterRun?.(testContext || ({} as TestContext))
        return p
      })
    })
  }
}
