import Graph from './Graph'

let graph: Graph<string>

beforeEach(() => {
  graph = new Graph()

  const vertices = ['A', 'B', 'C', 'D', 'E', 'F']

  for (let i = 0; i < vertices.length; i++) {
    graph.addVertex(vertices[i])
  }

  graph.addEdge('A', 'B')
  graph.addEdge('A', 'D')
  graph.addEdge('A', 'E')
  graph.addEdge('B', 'C')
  graph.addEdge('D', 'E')
  graph.addEdge('E', 'F')
  graph.addEdge('E', 'C')
  graph.addEdge('C', 'F')
})

test('dfs', () => {
  expect([...graph.dfs('A')]).toMatchInlineSnapshot(`
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
  expect([...graph.bfs('A')]).toMatchInlineSnapshot(`
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
