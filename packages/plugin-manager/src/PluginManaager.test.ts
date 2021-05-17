import PluginManager from './PluginManager'

let pluginManager: PluginManager

beforeEach(() => {
  pluginManager = new PluginManager()
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
