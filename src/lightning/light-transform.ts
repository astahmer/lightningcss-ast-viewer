import * as light from 'lightningcss-wasm'
import { composeVisitors } from './compose-visitors'
import { LightAstNode, LightningTransformResult, VisitorParam } from './types'
import { applyPrevCharacterToLocation, getNodeLocation } from './node-location'
import { LightningSourceText } from './light-source-text'

const enc = new TextEncoder()
const dec = new TextDecoder()

await light.default()

const isDebug = false
const createNode = (params: Omit<LightAstNode, 'children'>) => ({ ...params, children: [] } as LightAstNode)

export const lightningTransform = (
  css: string,
  options?: Omit<light.TransformOptions<light.CustomAtRules>, 'code' | 'filename'>,
) => {
  const nodes = new Set() as Set<LightAstNode>
  const visiteds = new Set() as Set<VisitorParam>

  let current: LightAstNode | undefined
  let currentRoot: LightAstNode | undefined
  let prev: LightAstNode | undefined
  let depth = 0
  let id = 0
  const prevWithLocationAtDepth = new Map<number, LightAstNode>()

  const stack = [] as LightAstNode[]
  const paths = [] as string[]
  const source = new LightningSourceText(css)

  const onEnterContainer = (node: LightAstNode) => {
    stack.push(node)
    depth++
    paths.push(node.type)
    isDebug && console.log(depth, `[enter] ${node.type}`, { stack, current })
    current = node
  }

  const onExitContainer = (type: LightAstNode['type']) => {
    stack.pop()
    current = stack[stack.length - 1]
    paths.pop()
    depth--
    isDebug && console.log(depth, `[exit] ${type}`, { stack, current })
  }

  const visitNode = (node: LightAstNode) => {
    isDebug && console.log(depth, `[visit] ${node.type}`, { stack, current })

    if (prev) {
      node.prev = prev
      prev.next = node
    }

    source.addNode(node)
    visiteds.add(node.data)

    const location = getNodeLocation(node)
    if (location) {
      // When we're back done with a node & its children
      // Assign prev node location to those that don't have one
      // Then reset prev node map except for those that are at the same depth
      if (depth === 0 || (prev && (prev.depth ?? 0) >= node.depth)) {
        const keys = Array.from(prevWithLocationAtDepth.keys())
        const keepKeys = keys
          .filter((key) => key === 0 || key <= (node.depth ?? 0))
          .map((key) => [key, prevWithLocationAtDepth.get(key)] as const)

        prevWithLocationAtDepth.forEach((prevNode, prevDepth) => {
          prevNode.pos = {
            start: getNodeLocation(prevNode)!,
            end: applyPrevCharacterToLocation(location, prevDepth + 2),
          }

          prevNode.text = source.extractNodeRange(prevNode)
        })

        prevWithLocationAtDepth.clear()
        if (keepKeys.length) {
          keepKeys.forEach(([key, value]) => {
            prevWithLocationAtDepth.set(key, value!)
          })
        }
        isDebug && console.log('onChangeRoot', keys)
      }

      prevWithLocationAtDepth.set(depth, node)
    }

    prev = node

    // is child
    if (current && (current.depth ?? 0) < node.depth) {
      const prevSibling = current.children[current.children.length - 1]
      if (prevSibling) {
        node.prevSibling = prevSibling
        node.prevSibling.nextSibling = node
      }

      current.children.push(node)
      node.parent = current
      return
    }

    // is a root node (doesn't have a parent)
    if (currentRoot) {
      currentRoot.nextSibling = node
      node.prevSibling = currentRoot
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
          const node = createNode({ type: 'Angle', data: angle, depth, id: id++ })
          visitNode(node)
        },
        Color(color) {
          const node = createNode({ type: 'Color', data: color, depth, id: id++ })
          visitNode(node)
        },
        CustomIdent(ident) {
          const node = createNode({ type: 'CustomIdent', data: ident, depth, id: id++ })
          visitNode(node)
        },
        DashedIdent(ident) {
          const node = createNode({ type: 'DashedIdent', data: ident, depth, id: id++ })
          visitNode(node)
        },
        Declaration(property) {
          const node = createNode({ type: 'Declaration', data: property, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        DeclarationExit(property) {
          onExitContainer('DeclarationExit')
          return property
        },
        EnvironmentVariable(env) {
          const node = createNode({ type: 'EnvironmentVariable', data: env, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        EnvironmentVariableExit(_env) {
          onExitContainer('EnvironmentVariableExit')
          return
        },
        Function(fn) {
          const node = createNode({ type: 'Function', data: fn, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        FunctionExit(_fn) {
          onExitContainer('FunctionExit')
          return
        },
        Image(image) {
          const node = createNode({ type: 'Image', data: image, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        ImageExit(image) {
          onExitContainer('ImageExit')
          return image
        },
        MediaQuery(query) {
          const node = createNode({ type: 'MediaQuery', data: query, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        MediaQueryExit(query) {
          onExitContainer('MediaQueryExit')
          return query
        },
        Ratio(ratio) {
          const node = createNode({ type: 'Ratio', data: ratio, depth, id: id++ })
          visitNode(node)
        },
        Resolution(resolution) {
          const node = createNode({ type: 'Resolution', data: resolution, depth, id: id++ })
          visitNode(node)
        },
        Rule(rule) {
          const node = createNode({ type: 'Rule', data: rule, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        RuleExit(rule) {
          onExitContainer('RuleExit')
          return rule
        },
        Selector(selector) {
          const node = createNode({ type: 'Selector', data: selector, depth, id: id++ })
          visitNode(node)
        },
        SupportsCondition(condition) {
          const node = createNode({ type: 'SupportsCondition', data: condition, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
          return condition
        },
        SupportsConditionExit(condition) {
          onExitContainer('SupportsConditionExit')
          return condition
        },
        Time(time) {
          const node = createNode({ type: 'Time', data: time, depth, id: id++ })
          visitNode(node)
        },
        Token(token) {
          const node = createNode({ type: 'Token', data: token, depth, id: id++ })
          visitNode(node)
        },
        Url(url) {
          const node = createNode({ type: 'Url', data: url, depth, id: id++ })
          visitNode(node)
        },
        Variable(variable) {
          const node = createNode({ type: 'Variable', data: variable, depth, id: id++ })
          visitNode(node)
          onEnterContainer(node)
        },
        VariableExit(_variable) {
          onExitContainer('VariableExit')
          return
        },
      },
      options?.visitor ?? {},
    ]),
  })

  // assign prev node location to those that don't have one
  prevWithLocationAtDepth.forEach((prevNode, prevDepth) => {
    prevNode.pos = {
      start: getNodeLocation(prevNode)!,
      end: applyPrevCharacterToLocation(source.lastLineColumn, prevDepth),
    }
    prevNode.text = source.extractNodeRange(prevNode)
  })

  source.assignNodeWithPos()
  return { nodes, visiteds, css: dec.decode(res.code), source } as LightningTransformResult
}
