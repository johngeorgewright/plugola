import { Replace } from 'ts-toolbelt/out/Object/Replace'

export function amend<
  O extends Record<string, unknown>,
  K extends keyof O,
  V extends O[K]
>(obj: O, key: K, fn: (value: O[K]) => V) {
  return {
    ...obj,
    [key]: fn(obj[key]),
  } as Replace<O, K, V>
}
