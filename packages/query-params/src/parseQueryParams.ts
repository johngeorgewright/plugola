import type { QueryParams } from './queryParams'

export default function parseQueryParams(searchString: string) {
  try {
    return searchString
      .replace(/^\?/, '')
      .split('&')
      .reduce<QueryParams>((queryParams, searchParam) => {
        let [key, value] = searchParam.split('=')
        key = decodeURIComponent(key)
        let queryParam: any

        switch (true) {
          case key.startsWith('!'):
            queryParams[key.substr(1)] = false
            break

          case key.endsWith('[]'):
            key = key.substr(0, key.length - 2)
            queryParams[key] = value
              ? decodeURIComponent(value).split(',')
              : true
            break

          case key.endsWith('{}'):
            key = key.substr(0, key.length - 2)
            queryParams[key] = JSON.parse(decodeURIComponent(value))
            break

          case key.endsWith('[+]'):
            key = key.substr(0, key.length - 3)
            queryParam = queryParams[key]
            queryParams[key] = [
              ...(Array.isArray(queryParam) ? queryParam : []),
              ...(value || '').split(',').map(decodeURIComponent),
            ]
            break

          case key.endsWith('[-]'):
            key = key.substr(0, key.length - 3)
            queryParam = queryParams[key]
            queryParam = Array.isArray(queryParam) ? queryParam : []
            const toRemove = (value || '').split(',').map(decodeURIComponent)
            for (const item of toRemove) {
              const index: number = queryParam.indexOf(item)
              if (index === -1) continue
              queryParam = [
                ...queryParam.slice(0, index),
                ...queryParam.slice(index + 1),
              ]
            }
            queryParams[key] = queryParam
            break

          default:
            queryParams[key] = value
              ? decodeURIComponent(value)
              : typeof value === 'string'
              ? value
              : true
        }

        return queryParams
      }, {})
  } catch (error) {
    console.error('ads', error)
    return {}
  }
}
