import Graph from './Graph'

let graph: Graph<string, 'like'>

beforeEach(() => {
  graph = new Graph()
  graph.addEdge('like', 'A', 'B')
  graph.addEdge('like', 'A', 'D')
  graph.addEdge('like', 'A', 'E')
  graph.addEdge('like', 'B', 'C')
  graph.addEdge('like', 'D', 'E')
  graph.addEdge('like', 'E', 'F')
  graph.addEdge('like', 'E', 'C')
  graph.addEdge('like', 'C', 'F')
})

test('dfs', () => {
  expect([...graph.dfs('A', 'like')]).toMatchInlineSnapshot(`
Array [
  "F",
  "C",
  "B",
  "E",
  "D",
  "A",
]
`)
})

test('bfs', () => {
  expect([...graph.bfs('A', 'like')]).toMatchInlineSnapshot(`
Array [
  "A",
  "B",
  "D",
  "E",
  "C",
  "F",
]
`)
})
