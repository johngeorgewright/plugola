import LoggerBehavior from './LoggerBehavior'

export default function createEnabledLoggerBehavior(label: string) {
  const enabledLoggerBehavior: LoggerBehavior = (...args: any[]) =>
    console.log(label, ...args)

  enabledLoggerBehavior.debug = (...args: any[]) =>
    console.debug(label, ...args)
  enabledLoggerBehavior.error = (...args: any[]) =>
    console.error(label, ...args)
  enabledLoggerBehavior.info = (...args: any[]) => console.info(label, ...args)
  enabledLoggerBehavior.log = (...args: any[]) => console.log(label, ...args)
  enabledLoggerBehavior.table = (...args: any[]) => {
    console.log(label, 'Table:')
    console.table(...args)
  }
  enabledLoggerBehavior.warn = (...args: any[]) => console.warn(label, ...args)

  return enabledLoggerBehavior
}
