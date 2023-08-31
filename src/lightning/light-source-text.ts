import { LightAstNode } from './types'
import { SourceText } from '../lib/source-text'
import { binarySearch } from '../lib/binary-search'

type NodeRange = [start: number, end: number]

export class LightningSourceText extends SourceText {
  private _nodes = new Set<LightAstNode>()
  private _nodesWithPos = [] as Array<[LightAstNode, NodeRange]>
  private posByNode = new WeakMap<LightAstNode, NodeRange>()

  constructor(text: string) {
    super(text)
  }

  get nodes() {
    return this._nodes
  }

  assignNodeWithPos() {
    this._nodes.forEach((node) => {
      if (node.pos) {
        const pos = [
          this.getPosAtLineAndColumn(node.pos.start.line, node.pos.start.column),
          this.getPosAtLineAndColumn(node.pos.end.line, node.pos.end.column),
        ] as NodeRange

        this.posByNode.set(node, pos)
        this._nodesWithPos.push([node, pos])
      }
    })
  }

  extractNodeRange(node: LightAstNode) {
    if (!node.pos) return ''

    const text = this.extractRange(
      node.pos.start.line,
      node.pos.start.column - 1,
      node.pos.end.line,
      node.pos.end.column - 1,
    )
    return text
  }

  addNode(node: LightAstNode) {
    this._nodes.add(node)
  }

  getNodeRange(node: LightAstNode) {
    if (!node.pos) return

    return this.posByNode.get(node)
  }

  findNodeAtLocation(line: number, column: number) {
    const pos = this.getPosAtLineAndColumn(line, column, false)
    const index = binarySearch(this._nodesWithPos, (item) => {
      const [_node, range] = item
      if (pos <= range[0]) return -1
      if (pos >= range[1] - 1) return 1
      return 0
    })

    const item = this._nodesWithPos[index]
    if (!item) return

    const node = item[0]
    if (!node.children.length) return node

    const childIndex = binarySearch(
      node.children.filter((n) => n.pos),
      (child) => {
        const range = this.getNodeRange(child)!
        if (pos <= range[0]) return -1
        if (pos >= range[1] - 1) return 1
        return 0
      },
    )

    const child = node.children[childIndex]
    if (child) return child

    return node
  }
}
