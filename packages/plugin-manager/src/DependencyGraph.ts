import { Graph } from '@plugola/graph'
import { Plugin } from './Plugin'

export default class DependencyGraph<T extends Plugin<any, any>> extends Graph<
  T,
  'dependency' | 'dependencyTo'
> {
  addDependency(source: T, dependency: T) {
    this.addEdge('dependency', source, dependency)
    this.addEdge('dependencyTo', dependency, source)
  }

  *names() {
    for (const vertex of this.verticies()) {
      yield vertex.name
    }
  }

  dependencies(node: T) {
    return this.bfs(node, 'dependency')
  }

  whichDependOn(node: T) {
    return this.bfs(node, 'dependencyTo')
  }
}
