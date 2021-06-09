export type UnpackResolvableValue<T> = T extends Promise<infer R>
  ? UnpackResolvableValue<R>
  : T
