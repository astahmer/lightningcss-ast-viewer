import * as light from 'lightningcss-wasm'
import { LightAstNode } from './types'

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

export const applyPrevCharacterToLocation = (location: light.Location) => {
  if (location.column > 1) {
    return { ...location, column: location.column - 1 }
  }

  if (location.line > 1) {
    return { ...location, line: location.line - 1 }
  }

  return location
}
