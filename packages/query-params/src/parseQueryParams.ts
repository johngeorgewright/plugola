import type { QueryParams } from './queryParams'

export default function parseQueryParams(searchString: string) {
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

        if (key.startsWith('!')) {
          return { ...queryParams, ...toFalse(key) }
        } else if (value === undefined) {
          return { ...queryParams, [key]: true }
        } else if (key.endsWith('[]')) {
          return { ...queryParams, ...toArray(key, value) }
        } else if (key.endsWith('[+]')) {
          return { ...queryParams, ...appendArray(key, value, queryParams) }
        } else if (key.endsWith('[-]')) {
          return { ...queryParams, ...removeFromArray(key, value, queryParams) }
        } else if (key.endsWith('{}')) {
          return { ...queryParams, ...toObject(key, value) }
        } else {
          return { ...queryParams, [key]: decodeURIComponent(value) }
        }
      }, {})
  } catch (error) {
    console.error('ads', error)
    return {}
  }
}

function toFalse(key: string) {
  return { [key.substr(1)]: false }
}

function toArray(key: string, value: string) {
  key = key.substr(0, key.length - 2)
  return { [key]: value ? decodeURIComponent(value).split(',') : true }
}

function appendArray(key: string, value: string, queryParams: QueryParams) {
  key = key.substr(0, key.length - 3)
  const queryParam = queryParams[key]
  return {
    [key]: [
      ...(Array.isArray(queryParam) ? queryParam : []),
      ...(value || '').split(',').map(decodeURIComponent),
    ],
  }
}

function removeFromArray(key: string, value: string, queryParams: QueryParams) {
  key = key.substr(0, key.length - 3)
  const queryParam = queryParams[key]
  return {
    [key]: value
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
      ),
  }
}

function toObject(key: string, value: string) {
  key = key.substr(0, key.length - 2)
  return { [key]: JSON.parse(decodeURIComponent(value)) }
}
