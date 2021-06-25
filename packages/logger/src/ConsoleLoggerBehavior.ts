import LoggerBehavior from './LoggerBehavior'
import { TabularData } from './types'

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

  table(label: string, data: TabularData) {
    console.log(`${label}[table]`)
    console.table(data)
  }

  warn(...args: any[]) {
    console.warn(...args)
  }
}
