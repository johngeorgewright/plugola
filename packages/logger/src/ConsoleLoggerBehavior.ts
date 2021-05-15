import LoggerBehavior from './LoggerBehavior'

export default class ConsoleLoggerBehavior implements LoggerBehavior {
  debug(...args: any[]) {
    console.debug(...args)
  }
  error(...args: any[]) {
    console.error(...args)
  }
  info(...args: any[]) {
    console.info(...args)
  }
  log(...args: any[]) {
    console.log(...args)
  }
  table(label: string, ...args: any[]) {
    console.log(label, 'Table:')
    console.table(...args)
  }
  warn(...args: any[]) {
    console.warn(...args)
  }
}
