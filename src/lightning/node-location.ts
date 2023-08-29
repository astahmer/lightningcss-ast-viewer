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

export const setLocationToPrevCharacter = (location: light.Location) => {
  if (location.column > 1) {
    return { line: location.line, column: location.column - 1 }
  }

  if (location.line > 1) {
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
