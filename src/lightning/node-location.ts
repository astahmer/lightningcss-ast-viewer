import type * as light from 'lightningcss-wasm'
import type { LightAstNode } from './types'
import type postcss from 'postcss'

export const getNodeLocation = (
  node: LightAstNode,
  transform: (loc: light.Location) => light.Location = (loc) => loc,
) => {
  if (
    typeof node.data === 'object' &&
    'value' in node.data &&
    typeof node.data.value === 'object' &&
    node.data.value &&
    'loc' in node.data.value
  ) {
    return transform(node.data.value.loc)
  }
}

const setLocationToPrevCharacter = (location: light.Location) => {
  if (location.column > 0) {
    return { line: location.line, column: location.column - 1 }
  }

  if (location.line > 0) {
    return { line: location.line - 1, column: location.column }
  }

  return location
}

export const applyPrevCharacterToLocation = (location: light.Location, count = 1) => {
  let loc = location
  for (let i = 0; i < count; i++) {
    loc = setLocationToPrevCharacter(loc)
  }
  return loc
}

export const getNodeWithPosFrom = (node: LightAstNode) => {
  let current = node as LightAstNode | undefined
  while (current) {
    if (current.pos) {
      return current
    }

    current = current.parent
  }

  return node
}

export const getPostCSSNodeWithSourceFrom = (node: postcss.Node) => {
  let current = node as postcss.Node | undefined
  while (current) {
    if (current.source?.start && current.source?.end) {
      return current
    }

    current = current.parent
  }

  return node
}
