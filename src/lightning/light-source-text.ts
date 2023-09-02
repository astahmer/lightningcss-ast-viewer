import { LightAstNode } from './types'
import { SourceText } from '../lib/source-text'
import { binarySearch } from '../lib/binary-search'

export type StartEndRange = [start: number, end: number]

export class LightningSourceText extends SourceText {
  private _nodes = new Set<LightAstNode>()
  private _nodesWithPos = [] as Array<[LightAstNode, StartEndRange]>
  private posByNode = new WeakMap<LightAstNode, StartEndRange>()

  constructor(text: string) {
    super(text)
  }

  get nodes() {
    return this._nodes
  }

  assignNodeWithPos() {
    this._nodes.forEach((node) => {
      if (node.pos) {
        const range = [
          this.getPosAtLineAndColumn(node.pos.start.line, node.pos.start.column),
          this.getPosAtLineAndColumn(node.pos.end.line, node.pos.end.column),
        ] as StartEndRange

        this.posByNode.set(node, range)
        this._nodesWithPos.push([node, range])
      }
    })
  }

  extractNodeTextInRange(node: LightAstNode) {
    if (!node.pos) return ''

    const text = this.extractTextInRange(
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

  findChildAtPosition(node: LightAstNode, startPos: number, endPos: number = startPos) {
    const childIndex = binarySearch(
      node.children.filter((n) => n.pos),
      (child) => {
        const range = this.getNodeRange(child)!
        if (endPos <= range[0]) return -1
        if (startPos >= range[1] - 1) return 1
        return 0
      },
    )

    const child = node.children[childIndex]
    if (child) return child
  }

  findNodeAtPosition(startPos: number, endPos: number = startPos) {
    const index = binarySearch(this._nodesWithPos, (item) => {
      const [_node, range] = item
      if (endPos <= range[0]) return -1
      if (startPos >= range[1] - 1) return 1
      return 0
    })

    const item = this._nodesWithPos[index]
    if (!item) return

    const node = item[0]
    if (!node.children.length) return node

    const child = this.findChildAtPosition(node, startPos, endPos)
    if (child) return child

    return node
  }

  findNodeAtLocation(line: number, column: number) {
    const pos = this.getPosAtLineAndColumn(line, column, false)
    return this.findNodeAtPosition(pos)
  }
}
