import LoggerBehavior from './LoggerBehavior'

export default class Logger extends LoggerBehavior {
  constructor(
    protected name: string,
    private behavior: LoggerBehavior,
    private label: string = `[${name}]`
  ) {
    super()
  }

  debug(...args: any[]) {
    this.behavior.debug(this.label, ...args)
  }

  error(...args: any[]) {
    this.behavior.error(this.label, ...args)
  }

  extend(label: string) {
    return new Logger(this.name, this.behavior, `${this.label}[${label}]`)
  }

  info(...args: any[]) {
    this.behavior.info(this.label, ...args)
  }

  log(...args: any[]) {
    this.behavior.log(this.label, ...args)
  }

  table(...args: any[]) {
    this.behavior.table(this.label, ...args)
  }

  warn(...args: any[]) {
    this.behavior.warn(this.label, ...args)
  }
}
