import * as light from 'lightningcss-wasm'
import { SourceText } from '../lib/source-text'

type AngleNode = { type: 'Angle'; data: light.Angle }
type ColorNode = { type: 'Color'; data: light.CssColor }
type CustomIdentNode = { type: 'CustomIdent'; data: string }
type DashedIdentNode = { type: 'DashedIdent'; data: string }
type DeclarationNode = { type: 'Declaration'; data: light.Declaration }
type DeclarationExitNode = { type: 'DeclarationExit'; data: light.Declaration }
type EnvironmentVariableNode = { type: 'EnvironmentVariable'; data: light.EnvironmentVariable }
type EnvironmentVariableExitNode = { type: 'EnvironmentVariableExit'; data: light.EnvironmentVariable }
type FunctionNode = { type: 'Function'; data: light.Function }
type FunctionExitNode = { type: 'FunctionExit'; data: light.Function }
type ImageNode = { type: 'Image'; data: light.Image }
type ImageExitNode = { type: 'ImageExit'; data: light.Image }
type MediaQueryNode = { type: 'MediaQuery'; data: light.MediaQuery }
type MediaQueryExitNode = { type: 'MediaQueryExit'; data: light.MediaQuery }
type RatioNode = { type: 'Ratio'; data: light.Ratio }
type ResolutionNode = { type: 'Resolution'; data: light.Resolution }
type RuleNode = { type: 'Rule'; data: light.Rule }
type RuleExitNode = { type: 'RuleExit'; data: light.Rule }
type SelectorNode = { type: 'Selector'; data: light.Selector }
type SupportsConditionNode = { type: 'SupportsCondition'; data: light.SupportsCondition }
type SupportsConditionExitNode = { type: 'SupportsConditionExit'; data: light.SupportsCondition }
type TimeNode = { type: 'Time'; data: light.Time }
type TokenNode = { type: 'Token'; data: light.Token }
type UrlNode = { type: 'Url'; data: light.Url }
type VariableNode = { type: 'Variable'; data: light.Variable }
type VariableExitNode = { type: 'VariableExit'; data: light.Variable }

export type LightVisitors = light.Visitor<never>
export type LightAstNode = (
  | AngleNode
  | ColorNode
  | CustomIdentNode
  | DashedIdentNode
  | DeclarationNode
  | DeclarationExitNode
  | EnvironmentVariableNode
  | EnvironmentVariableExitNode
  | FunctionNode
  | FunctionExitNode
  | ImageNode
  | ImageExitNode
  | MediaQueryNode
  | MediaQueryExitNode
  | RatioNode
  | ResolutionNode
  | RuleNode
  | RuleExitNode
  | SelectorNode
  | SupportsConditionNode
  | SupportsConditionExitNode
  | TimeNode
  | TokenNode
  | UrlNode
  | VariableNode
  | VariableExitNode
) & {
  children: LightAstNode[]
  parent?: LightAstNode
  prev?: LightAstNode
  next?: LightAstNode
  pos?: { start: light.Location; end: light.Location }
  text?: string
  depth?: number
}

export type VisitorParam = LightAstNode['data']

export type LightningTransformResult = {
  nodes: Set<LightAstNode>
  flatNodes: Set<VisitorParam>
  css: string
  source: SourceText
}
