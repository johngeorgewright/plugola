export interface Plugin<
  IC extends Record<string, unknown> = any,
  RC extends Record<string, unknown> = any
> {
  name: string
  dependencies?: string[]
  initTimeout?: number
  init?(context: IC): any
  run?(context: RC): any
}
