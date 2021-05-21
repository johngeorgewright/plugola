export function amend<O extends Record<string, unknown>, K extends keyof O>(
  obj: O,
  key: K,
  fn: (value: O[K]) => O[K]
) {
  return {
    ...obj,
    [key]: fn(obj[key]),
  }
}
