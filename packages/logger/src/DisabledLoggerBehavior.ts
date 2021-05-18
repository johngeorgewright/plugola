import LoggerBehavior from './LoggerBehavior'

export default class DisabledLoggerBehavior implements LoggerBehavior {
  debug() {}
  error(...args: string[]) {
    console.error(...args)
  }
  info() {}
  log() {}
  table() {}
  warn() {}
}
