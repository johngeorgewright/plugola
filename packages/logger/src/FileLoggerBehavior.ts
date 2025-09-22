import LoggerBehavior from './LoggerBehavior.js'
import { createWriteStream, WriteStream } from 'fs'
import { TabularData } from './types.js'
import consoleDump from './console.js'

export default class FileLoggerBehavior implements LoggerBehavior {
  readonly #writeSteam: WriteStream
  readonly #times = new Map<string, number>()

  constructor(fileName: string) {
    this.#writeSteam = createWriteStream(fileName, { flags: 'a' })
    process.on('beforeExit', () => this.#writeSteam.close())
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
    this.info(label, ...args)
  }

  table(label: string, data: TabularData) {
    this.#log('table', label, [])
    this.#writeSteam.write(consoleDump.table(data) + '\n')
  }

  time(label: string, name: string) {
    this.#times.set(`${label}[${name}]`, Date.now())
  }

  timeEnd(label: string, name: string) {
    const key = `${label}[${name}]`
    if (!this.#times.has(key)) return
    const time = Date.now() - this.#times.get(key)!
    this.#times.delete(key)
    this.#log('info', key, [`${time} ms`])
  }

  warn(label: string, ...args: any[]) {
    this.#log('warn', label, args)
  }

  #log(severity: string, label: string, args: any[]) {
    const date = new Date()
    this.#writeSteam.write(
      `${date.toISOString()} ${label}[${severity}] ${args
        .map((arg) => JSON.stringify(arg))
        .join(' ')}\n`
    )
  }
}
