import LoggerBehavior from './LoggerBehavior'

export default class DisabledLoggerBehavior implements LoggerBehavior {
  debug() {}
  error() {}
  info() {}
  log() {}
  table() {}
  warn() {}
}
