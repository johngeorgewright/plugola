export default abstract class LoggerBehavior {
  abstract debug(label: string, ...args: any[]): void
  abstract error(label: string, ...args: any[]): void
  abstract info(label: string, ...args: any[]): void
  abstract log(label: string, ...args: any[]): void
  abstract table(label: string, ...args: any[]): void
  abstract warn(label: string, ...args: any[]): void
}
