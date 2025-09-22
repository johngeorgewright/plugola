export interface RunContext {
  signal: AbortSignal
}

export interface EnableContext {
  signal: AbortSignal
  enablePlugins(pluginNames: string[], force?: boolean): Promise<void>
  disablePlugins(pluginNames: string[], force?: boolean): number
}
