import type { Store } from '@plugola/store'
import type { Logger } from '@plugola/logger'

export default function storeLogger(store: Store<any, any>, logger: Logger) {
  store.subscribe((action, state) => {
    logger.info(action, state)
  })

  store.subscribeToStaleEvents((action) => {
    logger.info(action, 'NO_CHANGE')
  })
}
