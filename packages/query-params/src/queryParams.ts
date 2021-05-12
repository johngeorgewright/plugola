import parseQueryParams from './parseQueryParams'

type QueryParam = string | boolean | number | Record<string, boolean | number>
export type QueryParams = Record<string, QueryParam | QueryParam[]>

const queryParams = parseQueryParams(location.search)
export default queryParams
