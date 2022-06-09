import parseQueryParams from './parseQueryParams'

type QueryParam = string | boolean | number | Record<string, boolean | number>
export type QueryParams = Record<string, QueryParam | QueryParam[]>

const queryParams = {
  ...(typeof process?.env.PLUGOLA_QUERY !== 'undefined'
    ? parseQueryParams(process.env.PLUGOLA_QUERY)
    : {}),
  ...(typeof location !== 'undefined' ? parseQueryParams(location.search) : {}),
}

export default queryParams
