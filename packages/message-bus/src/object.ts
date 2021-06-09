import { O } from 'ts-toolbelt'

export function amend<
  O extends O.Record<string>,
  K extends keyof O,
  V extends O[K]
>(obj: O, key: K, fn: (value: O[K]) => V) {
  return {
    ...obj,
    [key]: fn(obj[key]),
  } as O.Replace<O, K, V>
}
