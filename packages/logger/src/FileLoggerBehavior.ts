import LoggerBehavior from './LoggerBehavior'
import { createWriteStream, WriteStream } from 'fs'
import { TabularData } from './types'
import consoleDump from './console'

export default class FileLoggerBehavior implements LoggerBehavior {
  readonly #writeSteam: WriteStream

  constructor(fileName: string) {
    this.#writeSteam = createWriteStream(fileName, { flags: 'a' })
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
