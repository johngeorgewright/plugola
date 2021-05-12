export default interface LoggerBehavior {
  (...args: any[]): void
  debug(...args: any[]): void
  error(...args: any[]): void
  info(...args: any[]): void
  log(...args: any[]): void
  table(...args: any[]): void
  warn(...args: any[]): void
}
