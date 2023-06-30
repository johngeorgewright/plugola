# @plugola/plugin-manager

## Examples

Creating a plugin manager and a session depth plugin.

```typescript
// ./index.ts

import pluginManager from './pluginManager'
import './plugins/session-depth'
;(async () => {
  await pluginManager.enablePlugins(['session-depth'])
  await pluginManager.run()
})()
```

```typescript
// ./plugin-manager.ts

import { PluginManager } from '@plugola/plugin-manager'
import { Logger, ConsoleLoggerBehavior } from '@plugola/logger'

const pluginManager = new PluginManager({
  addContext: (pluginName) => ({
    log: new Logger(pluginName, new ConsoleLoggerBehavior()),
    sessionStorage,
  }),
})

export default pluginManager
```

```typescript
// ./plugins/session-depth.ts

import pluginManager from './pluginManager'

pluginManager.registerPlugin('session-depth', {
  async run({ log, sessionStorage }) {
    const depth = Number(sessionStorage.getItem('visitied') || '0') + 1
    log.debug('depth', depth)
    sessionStorage.setItem('visited', depth)
  },
})
```
