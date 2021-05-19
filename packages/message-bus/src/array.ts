import { L } from 'ts-toolbelt'

export function init<T>(array: T[]) {
  return array.slice(0, -1)
}

export function last<T>(array: never[]): undefined
export function last<T, R extends T>(array: [...T[], R]): R
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1]
}

export function removeItem<T>(item: T, array: T[]) {
  const index = array.indexOf(item)
  return index === -1
    ? array
    : [...array.slice(0, index), ...array.slice(index + 1)]
}

export function replaceLastItem(array: never[], item: unknown): never[]
export function replaceLastItem<Ts extends unknown[], T>(
  array: Ts,
  item: T
): L.Append<L.Pop<Ts>, T>
export function replaceLastItem<Ts extends unknown[], T>(array: Ts, item: T) {
  return array.length === 0 ? array : [...init(array), item]
}
