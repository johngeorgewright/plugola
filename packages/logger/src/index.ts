import { queryParams } from '@plugola/query-params'
import disabledLoggerBehavior from './disabledLoggerBehavior'
import createEnabledLoggerBehavior from './enabledLoggerBehavior'
import LoggerBehavior from './LoggerBehavior'

export default function createLogger(
  pluginName: string,
  enabled: boolean = isEnabled(pluginName),
  label: string = `[${pluginName}]`
): Logger {
  const logger = (
    enabled ? createEnabledLoggerBehavior(label) : disabledLoggerBehavior
  ) as Logger

  logger.extend = (ext: string) =>
    createLogger(pluginName, enabled, `${label}[${ext}]`)

  return logger
}

export interface Logger extends LoggerBehavior {
  extend(ext: string): Logger
}

function isEnabled(pluginName: string) {
  const debugQueryParam = queryParams['adsDebug']
  return Array.isArray(debugQueryParam)
    ? debugQueryParam.includes(pluginName)
    : debugQueryParam === true
}
