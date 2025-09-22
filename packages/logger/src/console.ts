import { Console } from 'node:console'
import { Transform } from 'node:stream'

const ts = new Transform({ transform: (chunk, _, cb) => cb(null, chunk) })
const logger = new Console({ stdout: ts, stderr: ts, colorMode: false })

export default new Proxy<Console>(logger, {
  get(target, prop) {
    return new Proxy(target[prop as keyof Console], {
      apply(fn, target, args) {
        ;(fn as Function).apply(target, args)
        return (ts.read() || '').toString()
      },
    })
  },
})
