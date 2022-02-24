# @plugola/store

> State managemenet

## Usage

### Basic example

Imagine your `State` is an object with 1 property containing an `authors` property that is an array of author names.

```typescript
interface State {
  authors: string[]
}
```

We want to have an "action" that adds authors to our state. So first describe our actions as an interface.

```typescript
import { BaseActions } from '@plugola/store'

interface Actions extends BaseActions {
  'add author': string
}
```

The above suggests we have 1 action "add author" which excepts a `string` as it's argument.

Now let's create the store.

```typescript
import Store from '@plugola/store'

const store = new Store<Actions, State>(
  // Initial state
  { authors: [] },

  // Actions
  {
    // You cannot mutate state. You must provide a new instance.
    'add author': (author, state) => ({
      ...state,
      authors: [...state.authors, author],
    }),
  }
)

// Initiate the store. This must be called for it to except state changes.
store.init()
```

Now we can dispatch our 'add author' event to change our state.

```typescript
console.info(store.state) // { authors: [] }
store.dispatch('add author', 'Jane Austin')
console.info(store.state) // { authors: ['Jane Austin'] }
```

### Subscribing to changes

One of the most useful things about the store is that you can subscribe to whenever the state updates.

```typescript
store.subscribe((action, state) => {
  console.info(action, 'just happened')
  console.info('now the state is', state)
})
```

The `subscribe` function returns an `unsubscribe` function.

```typescript
const unsubscribe = store.subscribe((action, state) => {
  if (state.authors.length > 5) unsubscribe()
})
```
