import LoggerBehavior from './LoggerBehavior.js'

export default class DisabledLoggerBehavior implements LoggerBehavior {
  debug() {}
  error(...args: string[]) {
    console.error(...args)
  }
  info() {}
  log() {}
  table() {}
  time() {}
  timeEnd() {}
  warn() {}
}
