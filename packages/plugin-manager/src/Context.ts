export interface RunContext {
  signal: AbortSignal
}

export interface InitContext {
  signal: AbortSignal
  enablePlugins(pluginNames: string[], force?: boolean): Promise<void>
  disablePlugins(pluginNames: string[], force?: boolean): number
}
