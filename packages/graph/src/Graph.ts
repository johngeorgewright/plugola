export default class Graph<T> {
  #adjList: Map<T, T[]>

  constructor() {
    this.#adjList = new Map()
  }

  addVertex(vertex: T) {
    this.#adjList.set(vertex, [])
  }

  addEdge(a: T, b: T) {
    const vertex = this.#adjList.get(a)
    if (!vertex) throw new RangeError('Non existent vertex')
    vertex.push(b)
  }

  *bfs(node: T) {
    const queue = [node]
    const visited = new Set<T>()

    while (queue.length) {
      const node = queue.shift()!
      if (visited.has(node)) continue
      visited.add(node)
      yield node
      const edges = this.#adjList.get(node)
      if (!edges) throw new RangeError('Non existent vertex')
      queue.push(...edges)
    }
  }

  *dfs(node: T, visited = new Set<T>()): Generator<T, Set<T>> {
    if (visited.has(node)) return visited
    const edges = this.#adjList.get(node)
    if (!edges) throw new RangeError('Non existent vertex')
    visited = new Set(visited).add(node)

    for (const edge of edges) {
      visited = yield* this.dfs(edge, visited)
    }

    yield node
    return visited
  }
}
