import * as light from 'lightningcss-wasm'
import { LightAstNode } from './types'
import { SourceText } from '../lib/source-text'

export class LightningSourceText extends SourceText {
  private _textByNode = new WeakMap<LightAstNode, string>()
  private _nodes = new Set<LightAstNode>()
  private _lastNode: LightAstNode | undefined

  constructor(text: string) {
    super(text)
  }

  nodes() {
    return this._nodes
  }

  extractNodeRange(node: LightAstNode) {
    if (!node.pos) return ''
    if (this._textByNode.has(node)) return this._textByNode.get(node)!

    const text = this.extractRange(
      node.pos.start.line,
      node.pos.start.column - 1,
      node.pos.end.line,
      node.pos.end.column - 1,
    )
    this._textByNode.set(node, text)
    return text
  }

  add(node: LightAstNode) {
    this._nodes.add(node)
    this._lastNode = node
  }

  findNode(predicate: (node: LightAstNode) => boolean) {
    for (const node of this._nodes) {
      if (predicate(node)) {
        return node
      }
    }
  }

  findNodeFromRight(predicate: (node: LightAstNode) => boolean) {
    let current = this._lastNode
    while (current) {
      if (predicate(current)) {
        return current
      }
      current = current.prev
    }
  }

  findNodeAtLocation(line: number, column: number) {
    return this.findNodeFromRight((node) => {
      if (!node.pos) return false
      return isWithinLocation({ line, column }, node.pos.start, node.pos.end)
    })
  }
}

function isWithinLocation(target: light.Location, start: light.Location, end: light.Location): boolean {
  if (target.line < start.line || target.line > end.line) {
    return false
  }

  if (target.line === start.line && target.column < start.column) {
    return false
  }

  if (target.line === end.line && target.column > end.column) {
    return false
  }

  return true
}
