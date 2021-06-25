import { TabularData } from './types'

export default interface LoggerBehavior {
  debug(label: string, ...args: any[]): void
  error(label: string, ...args: any[]): void
  info(label: string, ...args: any[]): void
  log(label: string, ...args: any[]): void
  table(label: string, data: TabularData): void
  warn(label: string, ...args: any[]): void
}
