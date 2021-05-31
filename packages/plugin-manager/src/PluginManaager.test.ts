import { MessageBus } from '@plugola/message-bus'
import PluginManager from './PluginManager'

type Events = { foo: [string] }

let messageBus: MessageBus<Events>
let pluginManager: PluginManager<typeof messageBus>

beforeEach(() => {
  messageBus = new MessageBus()
  messageBus.start()
  pluginManager = new PluginManager(messageBus)
})

test('initializing plugins', async () => {
  let result: string

  pluginManager.registerPlugin('mung', {
    init() {
      result = 'running mung'
    },
  })

  pluginManager.enableAllPlugins()
  await pluginManager.init()
  expect(result!).toBe('running mung')
})

test('initialize dependency tree', async () => {
  let result: string = ''

  pluginManager.registerPlugin('mung', {
    dependencies: ['bar', 'foo'],
    init() {
      result += 'mung'
    },
  })

  pluginManager.registerPlugin('bar', {
    dependencies: ['foo'],
    init() {
      result += 'bar'
    },
  })

  pluginManager.registerPlugin('foo', {
    init() {
      result += 'foo'
    },
  })

  pluginManager.enablePlugins(['mung'])
  await pluginManager.init()
  expect(result!).toBe('foobarmung')
})

test('running normal plugins', async () => {
  let result: string

  pluginManager.registerPlugin('mung', {
    run() {
      result = 'running mung'
    },
  })

  pluginManager.enableAllPlugins()
  await pluginManager.run()
  expect(result!).toBe('running mung')
})

test('running stateful plugins', async () => {
  let result: string

  pluginManager.registerStatefulPlugin<{ type: 'foo' }, 'foo' | 'bar'>('foo', {
    state: {
      initial: 'bar',

      reduce(action, state) {
        switch (action.type) {
          case 'foo':
            return 'foo'
          default:
            return state
        }
      },

      onUpdate(state) {
        console.info(state)
      },
    },

    run({ store }) {
      expect(store.state).toBe('bar')
      store.dispatch({ type: 'foo' })
      result = store.state
    },
  })

  pluginManager.enableAllPlugins()
  await pluginManager.run()
  expect(result!).toBe('foo')
})

test('running with a dependency tree', async () => {
  let result: string = ''

  pluginManager.registerPlugin('mung', {
    dependencies: ['bar', 'foo'],
    run() {
      result += 'mung'
    },
  })

  pluginManager.registerPlugin('bar', {
    dependencies: ['foo'],
    run() {
      result += 'bar'
    },
  })

  pluginManager.registerPlugin('foo', {
    run() {
      result += 'foo'
    },
  })

  pluginManager.enablePlugins(['mung'])
  await pluginManager.run()
  expect(result!).toBe('foobarmung')
})

test('using the message bus to communicate between plugins', (done) => {
  pluginManager.registerPlugin('foo', {
    run({ broker }) {
      broker.on('foo', (str) => {
        expect(str).toBe('bar')
        done()
      })
    },
  })

  pluginManager.registerPlugin('bar', {
    run({ broker }) {
      broker.emit('foo', 'bar')
    },
  })

  pluginManager.enableAllPlugins()
  pluginManager.run()
})

test('extra context', async () => {
  const pluginManager = new PluginManager(messageBus, {
    addContext(pluginName) {
      return {
        foo: pluginName,
      }
    },

    addInitContext() {
      return {
        bar: 'bar',
      }
    },

    addRunContext() {
      return {
        mung: 'face',
      }
    },
  })

  pluginManager.registerPlugin('my-plugin', {
    init({ foo, bar }) {
      expect(foo).toBe('my-plugin')
      expect(bar).toBe('bar')
    },

    run({ foo, mung }) {
      expect(foo).toBe('my-plugin')
      expect(mung).toBe('face')
    },
  })

  pluginManager.enableAllPlugins()
  await pluginManager.init()
  await pluginManager.run()
})

test('only run enabled plugins', async () => {
  const foo = jest.fn()
  const bar = jest.fn()

  pluginManager.registerPlugin('foo', {
    run: foo,
  })

  pluginManager.registerPlugin('bar', {
    run: bar,
  })

  pluginManager.enablePlugins(['foo'])

  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(bar).not.toHaveBeenCalled()
})

test('enabling plugins within the init phase', async () => {
  const foo = jest.fn()
  const bar = jest.fn()

  pluginManager.registerPlugin('foo', {
    init({ enablePlugins }) {
      enablePlugins(['bar'])
    },
    run: foo,
  })

  pluginManager.registerPlugin('bar', {
    run: bar,
  })

  pluginManager.enablePlugins(['foo'])

  await pluginManager.init()
  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(bar).toHaveBeenCalled()
})

test('disabling plugins within the init phase', async () => {
  const foo = jest.fn()
  const bar = jest.fn()

  pluginManager.registerPlugin('foo', {
    init({ disablePlugins }) {
      disablePlugins(['bar'])
    },
    run: foo,
  })

  pluginManager.registerPlugin('bar', {
    run: bar,
  })

  pluginManager.enablePlugins(['foo', 'bar'])

  await pluginManager.init()
  await pluginManager.run()

  expect(foo).toHaveBeenCalled()
  expect(bar).not.toHaveBeenCalled()
})
