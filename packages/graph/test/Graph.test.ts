import Graph from '../src/Graph.js'
import { beforeEach, expect, test } from 'vitest'

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
    [
      "F",
      "C",
      "B",
      "E",
      "D",
      "A",
    ]
  `)

  expect([...graph.dfs('A', 'like', false)]).toMatchInlineSnapshot(`
    [
      "F",
      "C",
      "B",
      "E",
      "D",
    ]
  `)
})

test('bfs', () => {
  expect([...graph.bfs('A', 'like')]).toMatchInlineSnapshot(`
    [
      "A",
      "B",
      "D",
      "E",
      "C",
      "F",
    ]
  `)

  expect([...graph.bfs('A', 'like', false)]).toMatchInlineSnapshot(`
    [
      "B",
      "D",
      "E",
      "C",
      "F",
    ]
  `)
})
