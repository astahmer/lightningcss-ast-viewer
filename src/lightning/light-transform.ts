import * as light from 'lightningcss-wasm'
import { composeVisitors } from './compose-visitors'
import { LightAstNode, LightningTransformResult, VisitorParam } from './types'
import { SourceText } from './source-text'
import { applyPrevCharacterToLocation, getNodeLocation } from './node-location'

const enc = new TextEncoder()
const dec = new TextDecoder()

await light.default()

// TODO add start/end loc when possible using `node.data.value.loc` and prev/next
const isDebug = false

export const lightningTransform = (
  css: string,
  options?: Omit<light.TransformOptions<light.CustomAtRules>, 'code' | 'filename'>,
) => {
  const nodes = new Set() as Set<LightAstNode>
  const flatNodes = new Set() as Set<VisitorParam>

  let current: LightAstNode | undefined
  let currentRoot: LightAstNode | undefined

  const stack = [] as LightAstNode[]
  const source = new SourceText(css)

  const onEnter = (node: LightAstNode) => {
    isDebug && console.log('onEnter', node.type, { stack, current })
    stack.push(node)
    current = node
  }

  const onExit = (type: LightAstNode['type']) => {
    isDebug && console.log('onExit', type, { stack, current })
    current = stack.pop()
  }

  const addNode = (node: LightAstNode) => {
    isDebug && console.log('addNode', node.type, { stack, current })
    flatNodes.add(node.data)

    // is child
    if (current && current !== node) {
      const prev = current.children[current.children.length - 1]
      if (prev) {
        node.prev = prev
        node.prev.next = node
      }

      current.children.push(node)
      node.parent = current
      return
    }

    // is not 1st node
    if (currentRoot) {
      currentRoot.next = node

      currentRoot.pos = {
        start: currentRoot.pos?.start ?? getNodeLocation(currentRoot) ?? { line: 0, column: 0 },
        end: getNodeLocation(node, applyPrevCharacterToLocation) ?? {
          line: source.lines.length,
          column: source.lines[source.lines.length - 1].length,
        },
      }
      currentRoot.text = source.extractRange(
        currentRoot.pos.start.line,
        currentRoot.pos.start.column - 1,
        currentRoot.pos.end.line,
        currentRoot.pos.end.column - 1,
      )

      node.prev = currentRoot
    }

    nodes.add(node)
    currentRoot = node
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

  // is last node
  if (currentRoot) {
    currentRoot.pos = {
      start: getNodeLocation(currentRoot) ?? { line: 0, column: 0 },
      end: { line: source.lines.length - 1, column: source.lines[source.lines.length - 1].length },
    }

    currentRoot.text = source.extractRange(
      currentRoot.pos.start.line,
      currentRoot.pos.start.column - 1,
      currentRoot.pos.end.line,
      currentRoot.pos.end.column - 1,
    )
  }

  return { nodes, flatNodes, css: dec.decode(res.code) } as LightningTransformResult
}
