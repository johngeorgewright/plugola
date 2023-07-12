import { Plugin } from '@plugola/plugin-manager'

export interface TestPlugin<
  TestContext extends Record<string, unknown>,
  PluginContext extends Record<string, unknown>,
  InitContext extends Record<string, unknown>,
  RunContext extends Record<string, unknown>
> {
  afterRun?(testContext: TestContext): any
  initContext?(pluginName: string): InitContext
  pluginContext?(pluginName: string): PluginContext
  runContext?(pluginName: string): RunContext
  testContext?(): TestContext
  tests: Record<
    string,
    Plugin<
      TestContext & PluginContext & InitContext,
      TestContext & PluginContext & RunContext
    >[]
  >
}
