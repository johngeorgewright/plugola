import LoggerBehavior from './LoggerBehavior'

export default class Logger implements LoggerBehavior {
  readonly #behaviors: LoggerBehavior[]
  readonly #label: string
  readonly #name: string

  constructor(
    name: string,
    behaviors: LoggerBehavior | LoggerBehavior[],
    label: string = `[${name}]`
  ) {
    this.#behaviors = Array.isArray(behaviors) ? behaviors : [behaviors]
    this.#label = label
    this.#name = name
  }

  get name() {
    return this.#name
  }

  debug(...args: any[]) {
    this.#behaviors.forEach((b) => b.debug(this.#label, ...args))
  }

  error(...args: any[]) {
    this.#behaviors.forEach((b) => b.error(this.#label, ...args))
  }

  extend(label: string) {
    return new Logger(this.#name, this.#behaviors, `${this.#label}[${label}]`)
  }

  info(...args: any[]) {
    this.#behaviors.forEach((b) => b.info(this.#label, ...args))
  }

  log(...args: any[]) {
    this.#behaviors.forEach((b) => b.log(this.#label, ...args))
  }

  table(...args: any[]) {
    this.#behaviors.forEach((b) => b.table(this.#label, ...args))
  }

  warn(...args: any[]) {
    this.#behaviors.forEach((b) => b.warn(this.#label, ...args))
  }
}