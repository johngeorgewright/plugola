import { O } from 'ts-toolbelt'

export function amend<
  O extends Record<string, unknown>,
  K extends keyof O,
  V extends O[K]
>(obj: O, key: K, fn: (value: O[K]) => V): O.Replace<O, K, V> {
  return {
    ...obj,
    [key]: fn(obj[key]),
  } as any
}
