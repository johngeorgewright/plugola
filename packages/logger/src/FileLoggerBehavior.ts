import LoggerBehavior from './LoggerBehavior'
import { createWriteStream, WriteStream } from 'fs'

export default class FileLoggerBehavior implements LoggerBehavior {
  readonly #writeSteam: WriteStream

  constructor(fileName: string) {
    this.#writeSteam = createWriteStream(fileName)
  }

  debug(label: string, ...args: any[]) {
    this.#log('debug', label, args)
  }

  error(label: string, ...args: any[]) {
    this.#log('error', label, args)
  }

  info(label: string, ...args: any[]) {
    this.#log('info', label, args)
  }

  log(label: string, ...args: any[]) {
    this.#log('info', label, args)
  }

  table(label: string, ...args: any[]) {
    const date = new Date()
    this.#writeSteam.write(
      `${date.toISOString()} ${label} ${args.map((x) => JSON.stringify(x))}\n`
    )
  }

  warn(label: string, ...args: any[]) {
    this.#log('warn', label, args)
  }

  #log(severity: string, label: string, args: any[]) {
    const date = new Date()
    this.#writeSteam.write(
      `${date.toISOString()} ${label}[${severity}] ${args.join(' ')}\n`
    )
  }
}
