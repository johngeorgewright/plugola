# @plugola/query-params

Parses search query parameters

## Examples

### Strings

```javascript
parseQueryParams('?foo=bar&mung=face')
// { foo: 'bar', mung: 'face' }
```

### Booleans

```javascript
parseQueryParams('foo&!bar')
// { foo: true, bar: false }
```

### Arrays

```javascript
parseQueryParams('foo[]=foo,bar')
// { foo: ['foo', 'bar'] }
```

### Flags

```javascript
parseQueryParams('foo{x}=mung,!face')
/* { 
  foo: { mung: true, face: false }
} */
```

### JSON

```javascript
parseQueryParams('foo{}={"bar": [1, 2]}')
/* {
  foo: {
    bar: [1, 2]
  }
} */
```

### Using all the options

```javascript
parseQueryParams('ignore[]=foo,bar&ac.foo=bar', {
  into: { version: 1 },
  filter: (key) => key.startsWith('ac.'),
  amendKey: (key) => key.substr(3),
})
// { foo: 'bar', version: 1 }
```
