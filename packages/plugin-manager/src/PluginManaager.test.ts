import PluginManager from './PluginManager'

let pluginManager: PluginManager

beforeEach(() => {
  pluginManager = new PluginManager()
})

test('initializing plugins', async () => {
  let result: string

  pluginManager.registerPlugin('mung', {
    init() {
      result = 'running mung'
    },
  })

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

  await pluginManager.run()
  expect(result!).toBe('foobarmung')
})