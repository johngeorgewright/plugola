import console from './console'

test('table', () => {
  class Person {
    constructor(
      public readonly firstName: string,
      public readonly lastName: string
    ) {}
  }

  expect(console.table(['apples', 'oranges', 'bananas']))
    .toMatchInlineSnapshot(`
    "┌─────────┬───────────┐
    │ (index) │  Values   │
    ├─────────┼───────────┤
    │    0    │ 'apples'  │
    │    1    │ 'oranges' │
    │    2    │ 'bananas' │
    └─────────┴───────────┘
    "
  `)

  expect(console.table(new Person('John', 'Smith'))).toMatchInlineSnapshot(`
    "┌───────────┬─────────┐
    │  (index)  │ Values  │
    ├───────────┼─────────┤
    │ firstName │ 'John'  │
    │ lastName  │ 'Smith' │
    └───────────┴─────────┘
    "
  `)

  expect(
    console.table([
      ['John', 'Smith'],
      ['Jane', 'Doe'],
      ['Emily', 'Jones'],
    ])
  ).toMatchInlineSnapshot

  expect(
    console.table([
      new Person('John', 'Smith'),
      new Person('Jane', 'Doe'),
      new Person('Emily', 'Jones'),
    ])
  ).toMatchInlineSnapshot(`
    "┌─────────┬───────────┬──────────┐
    │ (index) │ firstName │ lastName │
    ├─────────┼───────────┼──────────┤
    │    0    │  'John'   │ 'Smith'  │
    │    1    │  'Jane'   │  'Doe'   │
    │    2    │  'Emily'  │ 'Jones'  │
    └─────────┴───────────┴──────────┘
    "
  `)

  expect(
    console.table({
      mother: new Person('Jane', 'Smith'),
      father: new Person('John', 'Smith'),
      daughter: new Person('Emily', 'Smith'),
    })
  ).toMatchInlineSnapshot(`
    "┌──────────┬───────────┬──────────┐
    │ (index)  │ firstName │ lastName │
    ├──────────┼───────────┼──────────┤
    │  mother  │  'Jane'   │ 'Smith'  │
    │  father  │  'John'   │ 'Smith'  │
    │ daughter │  'Emily'  │ 'Smith'  │
    └──────────┴───────────┴──────────┘
    "
  `)
})
