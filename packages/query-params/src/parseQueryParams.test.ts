import parseQueryParams from './parseQueryParams'

test('strings', () => {
  expect(parseQueryParams('?foo=bar&mung=face')).toEqual({
    foo: 'bar',
    mung: 'face',
  })
})

test('without leading ?', () => {
  expect(parseQueryParams('foo=bar&mung=face')).toEqual({
    foo: 'bar',
    mung: 'face',
  })
})

test('booleans', () => {
  expect(parseQueryParams('foo&!bar')).toEqual({
    foo: true,
    bar: false,
  })
})

test('arrays', () => {
  expect(parseQueryParams('foo[]=foo,bar')).toEqual({
    foo: ['foo', 'bar'],
  })
})

test('appending arrays', () => {
  expect(parseQueryParams('foo[]=foo&foo[+]=bar,mung')).toEqual({
    foo: ['foo', 'bar', 'mung'],
  })
})

test('subtracting from arrays', () => {
  expect(parseQueryParams('foo[]=foo,bar&foo[-]=foo')).toEqual({
    foo: ['bar'],
  })
})
