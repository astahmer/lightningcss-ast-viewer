import * as light from 'lightningcss-wasm'
import { LightAstNode } from './types'
import { getNodeLocation } from './node-location'

const printLoc = (loc: light.Location) => {
  return `${loc.line}:${loc.column}`
}

export const printNodeLoc = (node: LightAstNode) => {
  const location = getNodeLocation(node)
  if (location) {
    return `(${printLoc(location)})`
  }
}

export const printNodeWithDetails = (node: LightAstNode) => {
  switch (node.type) {
    case 'Angle':
      return `Angle: ${node.data.value}${node.data.type}`
    case 'Color':
      return `Color: ${node.data.type}`
    case 'CustomIdent':
      return `CustomIdent: ${node.data}`
    case 'DashedIdent':
      return `DashedIdent: ${node.data}`
    case 'Declaration':
      return `Declaration: ${node.data.property}`
    case 'EnvironmentVariable':
      return `EnvironmentVariable: ${node.data.name}`
    case 'Function':
      return `Function: ${node.data.name} ${node.data.arguments.length}`
    case 'Image':
      return `Image: ${node.data.type}`
    case 'MediaQuery':
      return `MediaQuery: ${node.data.mediaType}`
    case 'Ratio':
      return `Ratio: ${node.data}`
    case 'Resolution':
      return `Resolution: ${node.data.value}`
    case 'Rule':
      return `Rule: ${node.data.type}`
    case 'Selector':
      return `Selector: ${node.data.map((s) => s.type).join('')}`
    case 'SupportsCondition':
      return `SupportsCondition: ${node.data.value}`
    case 'Time':
      return `Time: ${node.data.value}`
    case 'Token':
      return `Token: ${node.data.type}`
    case 'Url':
      return `Url`
    case 'Variable':
      return `Variable: ${node.data.name.ident}`
    default:
      return 'Unknown'
  }
}
