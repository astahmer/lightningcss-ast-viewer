import * as light from 'lightningcss-wasm'
import { LightAstNode } from './types'
import { SourceText } from '../lib/source-text'

export class LightningSourceText extends SourceText {
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

    const text = this.extractRange(
      node.pos.start.line,
      node.pos.start.column - 1,
      node.pos.end.line,
      node.pos.end.column - 1,
    )
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
    const maybeNode = this.findNodeFromRight((node) => {
      if (!node.pos) return false
      return isWithinLocation({ line, column }, node.pos.start, node.pos.end)
    })

    if (maybeNode) {
      if (!maybeNode.children.length) return maybeNode

      for (const child of maybeNode.children) {
        if (child.pos && isWithinLocation({ line, column }, child.pos.start, child.pos.end)) {
          return child
        }
      }

      return maybeNode
    }
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
