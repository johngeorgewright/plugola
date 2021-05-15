import type { QueryParams } from './queryParams'

interface Options {
  amendKey?(key: string): string
  into?: QueryParams
  filter?(key: string, value: string | undefined): boolean
}

export default function parseQueryParams(
  searchString: string,
  { amendKey = (k) => k, into = {}, filter = () => true }: Options = {}
) {
  try {
    return searchString
      .replace(/^\?/, '')
      .split('&')
      .reduce<QueryParams>((queryParams, searchParam) => {
        let [key, value] = searchParam.split('=') as [
          string,
          string | undefined
        ]

        key = decodeURIComponent(key)

        if (!filter(key, value)) {
          return queryParams
        }

        if (key.startsWith('!')) {
          return { ...queryParams, [amendKey(key.substr(1))]: false }
        } else if (value === undefined) {
          return { ...queryParams, [amendKey(key)]: true }
        } else if (key.endsWith('[]')) {
          return {
            ...queryParams,
            [amendKey(key.substr(0, key.length - 2))]: toArray(value),
          }
        } else if (key.endsWith('[+]')) {
          key = amendKey(key.substr(0, key.length - 3))
          return { ...queryParams, [key]: appendArray(value, queryParams[key]) }
        } else if (key.endsWith('[-]')) {
          key = amendKey(key.substr(0, key.length - 3))
          return {
            ...queryParams,
            [key]: removeFromArray(value, queryParams[key]),
          }
        } else if (key.endsWith('{x}')) {
          return {
            ...queryParams,
            [amendKey(key.substr(0, key.length - 3))]: toFlags(value),
          }
        } else if (key.endsWith('{}')) {
          return {
            ...queryParams,
            [amendKey(key.substr(0, key.length - 2))]: fromJSON(value),
          }
        } else {
          return { ...queryParams, [amendKey(key)]: decodeURIComponent(value) }
        }
      }, into)
  } catch (error) {
    console.error('ads', error)
    return into
  }
}

function toArray(value: string) {
  return decodeURIComponent(value).split(',')
}

function appendArray(value: string, queryParam: unknown) {
  return [
    ...(Array.isArray(queryParam) ? queryParam : []),
    ...(value || '').split(',').map(decodeURIComponent),
  ]
}

function removeFromArray(value: string, queryParam: unknown) {
  return value
    .split(',')
    .map(decodeURIComponent)
    .reduce(
      (queryParam, item) => {
        const index: number = queryParam.indexOf(item)
        return index === -1
          ? queryParam
          : [...queryParam.slice(0, index), ...queryParam.slice(index + 1)]
      },
      Array.isArray(queryParam) ? queryParam : []
    )
}

function toFlags(value: string) {
  const strs = toArray(value)
  return strs.reduce<Record<string, boolean>>((kvs, str) => {
    const v = !str.startsWith('!')
    const k = !v ? str.substr(1) : str
    return { ...kvs, [k]: v }
  }, {})
}

function fromJSON(value: string) {
  return JSON.parse(decodeURIComponent(value))
}
