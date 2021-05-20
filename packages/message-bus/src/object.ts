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

export function map<A, B>(
  a: Record<string, A>,
  fn: (value: A, key: string) => B
) {
  const b: Record<string, B> = {}

  for (const key in a) {
    b[key] = fn(a[key], key)
  }

  return b
}

export function isEmpty(obj: Record<string, unknown>) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false
    }
  }

  return true
}
