import '@plugola/logger'
import Logger, {
  ConsoleLoggerBehavior,
  DisabledLoggerBehavior,
} from '@plugola/logger'
import { queryParams } from '@plugola/query-params'

export default function createLogger(pluginName: string) {
  const enabled = Array.isArray(queryParams['debug'])
    ? queryParams['debug'].includes(pluginName)
    : queryParams['debug'] === true

  const behavior = enabled
    ? new ConsoleLoggerBehavior()
    : new DisabledLoggerBehavior()

  return new Logger(pluginName, behavior)
}
