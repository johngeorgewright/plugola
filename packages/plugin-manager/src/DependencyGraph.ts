import Graph from '@plugola/graph'
import { Plugin } from './Plugin.js'

export default class DependencyGraph<T extends Plugin> extends Graph<
  T,
  'dependency' | 'depender'
> {
  addDependency(source: T, dependency: T) {
    this.addEdge('dependency', source, dependency)
    this.addEdge('depender', dependency, source)
  }

  *names() {
    for (const vertex of this.verticies()) {
      yield vertex.name
    }
  }

  dependencies(node: T) {
    return this.bfs(node, 'dependency', false)
  }

  dependers(node: T) {
    return this.bfs(node, 'depender', false)
  }
}
