import * as light from 'lightningcss-wasm'
import { composeVisitors } from './compose-visitors'

const enc = new TextEncoder()
const dec = new TextDecoder()

await light.default()

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
) & { children: LightAstNode[]; parent?: LightAstNode; prev?: LightAstNode; next?: LightAstNode }

export type LightningTransformResult = {
  astNodes: Set<LightAstNode>
  flatNodes: Set<VisitorParam>
  css: string
}

// type VisitorFn = Exclude<light.Visitor<never>[keyof light.Visitor<never>], undefined>
// eslint-disable-next-line @typescript-eslint/ban-types
// type VisitorParam = Exclude<Parameters<Extract<VisitorFn, Function>>, undefined>[0]
type VisitorParam = LightAstNode['data']

const printLoc = (loc: light.Location) => {
  return `${loc.line}:${loc.column}`
}

export const printNodeLoc = (node: LightAstNode) => {
  if (
    typeof node.data === 'object' &&
    'value' in node.data &&
    typeof node.data.value === 'object' &&
    node.data.value &&
    'loc' in node.data.value
  ) {
    return `(${printLoc(node.data.value.loc)})`
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
      return `Variable: ${node.data.name}`
    default:
      return 'Unknown'
  }
}

export const lightningTransform = (
  css: string,
  options?: Omit<light.TransformOptions<light.CustomAtRules>, 'code' | 'filename'>,
) => {
  const astNodes = new Set() as Set<LightAstNode>
  const flatNodes = new Set() as Set<VisitorParam>

  let current: LightAstNode | undefined
  let currentRoot: LightAstNode | undefined
  const stack = [] as LightAstNode[]

  const onEnter = (node: LightAstNode) => {
    // console.log('onEnter', node.type, { stack, current })
    stack.push(node)
    current = node
  }

  const onExit = (_type: LightAstNode['type']) => {
    // console.log('onExit', type, { stack, current })
    current = stack.pop()
  }

  const addNode = (node: LightAstNode) => {
    flatNodes.add(node.data)
    if (current && current !== node) {
      const prev = current.children[current.children.length - 1]
      if (prev) {
        node.prev = prev
        node.prev.next = node
      }

      current.children.push(node)
      node.parent = current
    } else {
      if (currentRoot) {
        currentRoot.next = node
        node.prev = currentRoot
      }

      astNodes.add(node)
      currentRoot = node
    }
  }

  const res = light.transform({
    drafts: {
      nesting: true,
    },
    ...options,
    filename: 'test.css',
    code: enc.encode(css),
    visitor: composeVisitors([
      {
        Angle(angle) {
          const node = { type: 'Angle', data: angle, children: [] } as LightAstNode
          addNode(node)
        },
        Color(color) {
          const node = { type: 'Color', data: color, children: [] } as LightAstNode
          addNode(node)
        },
        CustomIdent(ident) {
          const node = { type: 'CustomIdent', data: ident, children: [] } as LightAstNode
          addNode(node)
        },
        DashedIdent(ident) {
          const node = { type: 'DashedIdent', data: ident, children: [] } as LightAstNode
          addNode(node)
        },
        Declaration(property) {
          const node = { type: 'Declaration', data: property, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        DeclarationExit(property) {
          onExit('DeclarationExit')
          current = stack.pop()
          return property
        },
        EnvironmentVariable(env) {
          const node = { type: 'EnvironmentVariable', data: env, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        EnvironmentVariableExit(_env) {
          onExit('EnvironmentVariableExit')
          current = stack.pop()
          return
        },
        Function(fn) {
          const node = { type: 'Function', data: fn, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        FunctionExit(_fn) {
          onExit('FunctionExit')
          current = stack.pop()
          return
        },
        Image(image) {
          const node = { type: 'Image', data: image, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        ImageExit(image) {
          onExit('ImageExit')
          current = stack.pop()
          return image
        },
        MediaQuery(query) {
          const node = { type: 'MediaQuery', data: query, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        MediaQueryExit(query) {
          onExit('MediaQueryExit')
          current = stack.pop()
          return query
        },
        Ratio(ratio) {
          const node = { type: 'Ratio', data: ratio, children: [] } as LightAstNode
          addNode(node)
        },
        Resolution(resolution) {
          const node = { type: 'Resolution', data: resolution, children: [] } as LightAstNode
          addNode(node)
        },
        Rule(rule) {
          const node = { type: 'Rule', data: rule, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        RuleExit(rule) {
          onExit('RuleExit')
          current = stack.pop()
          return rule
        },
        Selector(selector) {
          const node = { type: 'Selector', data: selector, children: [] } as LightAstNode
          addNode(node)
        },
        SupportsCondition(condition) {
          const node = { type: 'SupportsCondition', data: condition, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
          return condition
        },
        SupportsConditionExit(condition) {
          onExit('SupportsConditionExit')
          current = stack.pop()
          return condition
        },
        Time(time) {
          const node = { type: 'Time', data: time, children: [] } as LightAstNode
          addNode(node)
        },
        Token(token) {
          const node = { type: 'Token', data: token, children: [] } as LightAstNode
          addNode(node)
        },
        Url(url) {
          const node = { type: 'Url', data: url, children: [] } as LightAstNode
          addNode(node)
        },
        Variable(variable) {
          const node = { type: 'Variable', data: variable, children: [] } as LightAstNode
          addNode(node)
          onEnter(node)
        },
        VariableExit(_variable) {
          onExit('VariableExit')
          current = stack.pop()
          return
        },
      },
      options?.visitor ?? {},
    ]),
  })

  return { astNodes, flatNodes, css: dec.decode(res.code) } as LightningTransformResult
}
