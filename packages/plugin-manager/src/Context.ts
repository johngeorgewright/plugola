export interface RunContext {
  signal: AbortSignal
}

export interface InitContext {
  signal: AbortSignal
  enablePlugins(pluginNames: string[]): Promise<void>
  disablePlugins(pluginNames: string[]): void
}
