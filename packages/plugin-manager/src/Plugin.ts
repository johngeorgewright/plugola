export interface Plugin<
  EC extends Record<string, unknown> = any,
  RC extends Record<string, unknown> = any
> {
  name: string
  dependencies?: string[]
  initTimeout?: number
  enable?(context: EC): any
  run?(context: RC): any
}
