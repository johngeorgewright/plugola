export type Traverse<T, Edge extends string> = (
  graph: Graph<T, Edge>,
  node: T
) => Generator<T>

export default class Graph<T, Edge extends string> {
  #adjList = new Map<T, Partial<Record<Edge, Set<T>>>>()

  vertex(vertex: T) {
    if (!this.#adjList.has(vertex)) this.#adjList.set(vertex, {})
    return this.#adjList.get(vertex)!
  }

  verticies() {
    return this.#adjList.keys()
  }

  edges(vertex: T, type: Edge) {
    const edges = this.vertex(vertex)
    if (!edges[type]) edges[type] = new Set()
    return edges[type]
  }

  addEdge(name: Edge, source: T, destination: T) {
    this.vertex(destination)
    this.edges(source, name)!.add(destination)
  }

  find(fn: (node: T) => boolean) {
    for (const node of this.#adjList.keys()) {
      if (fn(node)) {
        return node
      }
    }

    throw new Error('Node not found')
  }

  *bfs(node: T, edgeName: Edge) {
    const queue = [node]
    const visited = new Set<T>()

    while (queue.length) {
      const node = queue.shift()!
      if (visited.has(node)) continue
      visited.add(node)
      yield node
      queue.push(...this.edges(node, edgeName)!)
    }
  }

  *dfs(node: T, edgeName: Edge, visited = new Set<T>()): Generator<T, Set<T>> {
    if (visited.has(node)) return visited
    visited = new Set(visited).add(node)

    for (const edge of this.edges(node, edgeName)!) {
      visited = yield* this.dfs(edge, edgeName, visited)
    }

    yield node
    return visited
  }
}
