import * as light from 'lightningcss-wasm'
import { composeVisitors } from './compose-visitors'
import { LightAstNode, LightningTransformResult, VisitorParam } from './types'
import { SourceText } from './source-text'
import { applyPrevCharacterToLocation, getNodeLocation } from './node-location'

const enc = new TextEncoder()
const dec = new TextDecoder()

await light.default()

const isDebug = false

export const lightningTransform = (
  css: string,
  options?: Omit<light.TransformOptions<light.CustomAtRules>, 'code' | 'filename'>,
) => {
  const nodes = new Set() as Set<LightAstNode>
  const flatNodes = new Set() as Set<VisitorParam>

  let current: LightAstNode | undefined
  let currentRoot: LightAstNode | undefined
  let depth = 0
  const prevWithLocationAtDepth = new Map<number, LightAstNode>()

  const stack = [] as LightAstNode[]
  const paths = [] as string[]
  const source = new SourceText(css)

  const onEnterContainer = (node: LightAstNode) => {
    stack.push(node)
    depth++
    paths.push(node.type)
    isDebug && console.log(depth, `[enter] ${node.type}`, { stack, current, depth }, paths)
    current = node
  }

  const onExitContainer = (type: LightAstNode['type']) => {
    isDebug && console.log(depth, `[exit] ${type}`, { stack, current })
    current = stack.pop()
    paths.pop()
    depth--
  }

  const visitNode = (node: LightAstNode) => {
    isDebug && console.log(depth, `[visit] ${node.type}`, { stack, current })
    flatNodes.add(node.data)

    const location = getNodeLocation(node)
    if (location) {
      // When we're back to the root
      // Assign prev node location to those that don't have one
      // Then reset prev node map except depth 0 (root)
      if (depth === 0) {
        const zeroDepth = prevWithLocationAtDepth.get(0)
        prevWithLocationAtDepth.forEach((prevNode) => {
          if (prevNode.pos) return

          prevNode.pos = {
            start: getNodeLocation(prevNode)!,
            end: applyPrevCharacterToLocation(location),
          }
          prevNode.text = source.extractRange(
            prevNode.pos.start.line,
            prevNode.pos.start.column - 1,
            prevNode.pos.end.line,
            prevNode.pos.end.column - 1,
          )
        })

        prevWithLocationAtDepth.clear()
        if (zeroDepth) {
          prevWithLocationAtDepth.set(0, zeroDepth)
        }
        isDebug && console.log('onChangeRoot', Array.from(prevWithLocationAtDepth.keys()))
      }

      prevWithLocationAtDepth.set(depth, node)
    }

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

    // is a root node (doesn't have a parent)
    if (currentRoot) {
      currentRoot.next = node
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
          visitNode(node)
        },
        Color(color) {
          const node = { type: 'Color', data: color, children: [] } as LightAstNode
          visitNode(node)
        },
        CustomIdent(ident) {
          const node = { type: 'CustomIdent', data: ident, children: [] } as LightAstNode
          visitNode(node)
        },
        DashedIdent(ident) {
          const node = { type: 'DashedIdent', data: ident, children: [] } as LightAstNode
          visitNode(node)
        },
        Declaration(property) {
          const node = { type: 'Declaration', data: property, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        DeclarationExit(property) {
          onExitContainer('DeclarationExit')
          current = stack.pop()
          return property
        },
        EnvironmentVariable(env) {
          const node = { type: 'EnvironmentVariable', data: env, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        EnvironmentVariableExit(_env) {
          onExitContainer('EnvironmentVariableExit')
          current = stack.pop()
          return
        },
        Function(fn) {
          const node = { type: 'Function', data: fn, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        FunctionExit(_fn) {
          onExitContainer('FunctionExit')
          current = stack.pop()
          return
        },
        Image(image) {
          const node = { type: 'Image', data: image, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        ImageExit(image) {
          onExitContainer('ImageExit')
          current = stack.pop()
          return image
        },
        MediaQuery(query) {
          const node = { type: 'MediaQuery', data: query, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        MediaQueryExit(query) {
          onExitContainer('MediaQueryExit')
          current = stack.pop()
          return query
        },
        Ratio(ratio) {
          const node = { type: 'Ratio', data: ratio, children: [] } as LightAstNode
          visitNode(node)
        },
        Resolution(resolution) {
          const node = { type: 'Resolution', data: resolution, children: [] } as LightAstNode
          visitNode(node)
        },
        Rule(rule) {
          const node = { type: 'Rule', data: rule, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        RuleExit(rule) {
          onExitContainer('RuleExit')
          current = stack.pop()
          return rule
        },
        Selector(selector) {
          const node = { type: 'Selector', data: selector, children: [] } as LightAstNode
          visitNode(node)
        },
        SupportsCondition(condition) {
          const node = { type: 'SupportsCondition', data: condition, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
          return condition
        },
        SupportsConditionExit(condition) {
          onExitContainer('SupportsConditionExit')
          current = stack.pop()
          return condition
        },
        Time(time) {
          const node = { type: 'Time', data: time, children: [] } as LightAstNode
          visitNode(node)
        },
        Token(token) {
          const node = { type: 'Token', data: token, children: [] } as LightAstNode
          visitNode(node)
        },
        Url(url) {
          const node = { type: 'Url', data: url, children: [] } as LightAstNode
          visitNode(node)
        },
        Variable(variable) {
          const node = { type: 'Variable', data: variable, children: [] } as LightAstNode
          visitNode(node)
          onEnterContainer(node)
        },
        VariableExit(_variable) {
          onExitContainer('VariableExit')
          current = stack.pop()
          return
        },
      },
      options?.visitor ?? {},
    ]),
  })

  // assign prev node location to those that don't have one
  prevWithLocationAtDepth.forEach((prevNode) => {
    if (prevNode.pos) return

    prevNode.pos = {
      start: getNodeLocation(prevNode)!,
      end: { line: source.lines.length - 1, column: source.lines[source.lines.length - 1].length },
    }
    prevNode.text = source.extractRange(
      prevNode.pos.start.line,
      prevNode.pos.start.column - 1,
      prevNode.pos.end.line,
      prevNode.pos.end.column - 1,
    )
  })

  return { nodes, flatNodes, css: dec.decode(res.code) } as LightningTransformResult
}
