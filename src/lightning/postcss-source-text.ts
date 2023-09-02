import postcss from 'postcss'
import { SourceText } from '../lib/source-text'
import { binarySearch } from '../lib/binary-search'

export type StartEndRange = [start: number, end: number]

type PostCSSNode = postcss.Node | postcss.Root | postcss.ChildNode

export class PostCSSSourceText extends SourceText {
  private _nodes = new Set<PostCSSNode>()
  private _nodesWithPos = [] as Array<[PostCSSNode, StartEndRange]>
  private posByNode = new WeakMap<PostCSSNode, StartEndRange>()
  private indexByNode = new WeakMap<PostCSSNode, number>()

  constructor(text: string) {
    super(text)
  }

  get nodes() {
    return this._nodes
  }

  extractNodeTextInRange(node: PostCSSNode) {
    if (!(node.source?.start && node.source?.end)) return ''

    const text = this.extractTextInRange(
      node.source.start.line,
      node.source.start.column - 1,
      node.source.end.line,
      node.source.end.column - 1,
    )
    return text
  }

  addNode(node: PostCSSNode) {
    this._nodes.add(node)

    if (node.source?.start && node.source?.end) {
      const pos = [
        this.getPosAtLineAndColumn(node.source.start.line - 1, node.source.start.column - 1),
        this.getPosAtLineAndColumn(node.source.end.line - 1, node.source.end.column - 1),
      ] as StartEndRange

      this.posByNode.set(node, pos)
      this._nodesWithPos.push([node, pos])
      this.indexByNode.set(node, this._nodesWithPos.length - 1)
    }
  }

  getNodeIndex(node: PostCSSNode) {
    return this.indexByNode.get(node)
  }

  getNodeRange(node: PostCSSNode) {
    if (!(node.source?.start && node.source?.end)) return

    return this.posByNode.get(node)
  }

  findNodeAtPosition(pos: number) {
    const index = binarySearch(this._nodesWithPos, (item) => {
      const [_node, range] = item
      if (pos <= range[0]) return -1
      if (pos >= range[1] - 1) return 1
      return 0
    })

    const item = this._nodesWithPos[index]
    if (!item) return

    const node = item[0]
    const children = 'nodes' in node ? node.nodes : undefined
    if (!children?.length) return node

    const childIndex = binarySearch(
      children.filter((n) => n.source),
      (child) => {
        const range = this.getNodeRange(child)!
        if (pos <= range[0]) return -1
        if (pos >= range[1] - 1) return 1
        return 0
      },
    )

    const child = children[childIndex]
    if (child) return child

    return node
  }

  findNodeAtLocation(line: number, column: number) {
    const pos = this.getPosAtLineAndColumn(line, column, false)
    return this.findNodeAtPosition(pos)
  }
}
