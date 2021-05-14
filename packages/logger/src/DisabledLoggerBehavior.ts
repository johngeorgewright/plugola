import LoggerBehavior from './LoggerBehavior'

export default class DisabledLoggerBehavior extends LoggerBehavior {
  debug() {}
  error() {}
  info() {}
  log() {}
  table() {}
  warn() {}
}
