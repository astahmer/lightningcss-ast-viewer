import postcss from 'postcss'
import { assign, createMachine } from 'xstate'
import { urlSaver } from '../lib/url-saver'
import { lightningTransform } from './light-transform'
import { LightAstNode, LightVisitors, LightningTransformResult } from './types'
import { sampleCss } from './sample-data'
import { LightningSourceText, StartEndRange } from './light-source-text'
import { getNodeWithPosFrom, getPostCSSNodeWithSourceFrom } from './node-location'
import { PostCSSSourceText } from './postcss-source-text'

const defaultResult: LightningTransformResult = {
  nodes: new Set(),
  visiteds: new Set(),
  css: '',
  source: new LightningSourceText(''),
}

const initialCtx = {
  input: urlSaver.getValue('input') || sampleCss.mediaQueries,
  output: defaultResult,
  visitors: {} as LightVisitors,
  postcssRoot: undefined as postcss.Root | undefined,
  postcssSource: undefined as PostCSSSourceText | undefined,
  selectedNode: undefined as LightAstNode | undefined,
  selectedRange: undefined as StartEndRange | undefined,
  selectedPostCSSNode: undefined as postcss.Node | undefined,
  error: undefined as Error | undefined,
  ui: {
    withTreeDetails: false,
    activeInputTab: 'none',
    isInputBottomPanelOpen: false,
  },
}

type PlaygroundEvent =
  | { type: 'Loaded' }
  | { type: 'ChangeInput'; params: { value: string } }
  | { type: 'ChangeVisitors'; params: { visitors: LightVisitors } }
  | { type: 'SelectNode'; params: { node: LightAstNode | undefined } }
  | { type: 'SelectPostCSSNode'; params: { node: postcss.Node | undefined } }
  | { type: 'ToggleTreeDetails' }
  | { type: 'ResetUiState' }
  | { type: 'DisplayError'; params: { title: string; description: string } }
  | { type: 'SetActiveInputTab'; params: { tab: string } }
  | { type: 'ToggleBottomPanel' }

export const playgroundMachine = createMachine(
  {
    id: 'playground',
    initial: 'Loading',
    types: {
      context: {} as typeof initialCtx,
      events: {} as PlaygroundEvent,
    },
    context: initialCtx,
    states: {
      Loading: { on: { Loaded: { target: 'Ready', actions: 'transform' } } },
      Ready: {
        on: {
          ChangeInput: { actions: ['setInput', 'transform'] },
          ChangeVisitors: { actions: ['setVisitors', 'transform'] },
          SelectNode: { actions: ['selectNode', 'onSelectNode'] },
          SelectPostCSSNode: { actions: ['selectPostCSSNode', 'onSelectNode'] },
          //
          ToggleTreeDetails: { actions: 'toggleTreeDetails' },
          SetActiveInputTab: { actions: 'setActiveInputTab' },
          ToggleBottomPanel: { actions: 'toggleBottomPanel' },
          ResetUiState: { actions: 'resetUiState' },
          DisplayError: { actions: 'displayError' },
        },
      },
    },
  },
  {
    actions: {
      setInput: assign({
        input: ({ event, context }) => (event.type === 'ChangeInput' ? event.params.value : context.input),
      }),
      setVisitors: assign({
        visitors: ({ event, context }) => (event.type === 'ChangeVisitors' ? event.params.visitors : context.visitors),
      }),
      selectNode: assign(({ event, context }) => {
        if (event.type !== 'SelectNode') return context

        const selectedNode = event.params.node
        if (!selectedNode) {
          return {
            selectedNode: undefined,
            selectedRange: undefined,
            selectedPostCSSNode: undefined,
          }
        }

        const selectedRange = context.output.source.getNodeRange(getNodeWithPosFrom(selectedNode))

        return {
          selectedNode,
          selectedRange,
          selectedPostCSSNode: selectedRange && context.postcssSource?.findNodeAtPosition(selectedRange[0]),
        }
      }),
      selectPostCSSNode: assign(({ event, context }) => {
        if (event.type !== 'SelectPostCSSNode') return context

        const selectedPostCSSNode = event.params.node
        if (!selectedPostCSSNode) {
          return {
            selectedNode: undefined,
            selectedRange: undefined,
            selectedPostCSSNode: undefined,
          }
        }

        const withPos = getPostCSSNodeWithSourceFrom(selectedPostCSSNode)
        const selectedRange = context.postcssSource?.getNodeRange(withPos)
        let selectedNode
        if (selectedRange) {
          selectedNode = context.output.source.findNodeAtPosition(selectedRange[0] + 1, selectedRange[1])
        }

        return {
          selectedNode,
          selectedRange,
          selectedPostCSSNode,
        }
      }),
      toggleTreeDetails: assign({
        ui: ({ context }) => ({ ...context.ui, withTreeDetails: !context.ui.withTreeDetails }),
      }),
      setActiveInputTab: assign({
        ui: ({ context, event }) => ({
          ...context.ui,
          activeInputTab:
            (event.type === 'SetActiveInputTab' ? event.params.tab : context.ui.activeInputTab) ?? 'output',
        }),
      }),
      toggleBottomPanel: assign({
        ui: ({ context, event }) => {
          let activeInputTab = context.ui.activeInputTab
          if (event.type === 'ToggleBottomPanel' && context.ui.activeInputTab === 'none') {
            activeInputTab = 'output'
          }

          return {
            ...context.ui,
            activeInputTab,
            isInputBottomPanelOpen: !context.ui.isInputBottomPanelOpen,
          }
        },
      }),
      transform: assign(({ context, event, self }) => {
        if (event.type !== 'ChangeInput' && event.type !== 'ChangeVisitors' && event.type !== 'Loaded') return context

        const input = event.type === 'ChangeInput' ? event.params.value : context.input
        const visitors = event.type === 'ChangeVisitors' ? event.params.visitors : context.visitors
        const prevOutput = context.output

        try {
          const output = lightningTransform(input, { visitor: visitors })
          const postcssSource = new PostCSSSourceText(input)
          const postcssRoot = postcss.parse(input)
          postcssRoot.walk((node) => postcssSource.addNode(node))

          console.log({ output, postcssRoot })
          urlSaver.setValue('input', input)

          // reset selected on output change
          if (output.css !== prevOutput.css) {
            self.send({ type: 'SelectNode', params: { node: undefined } })
            self.send({ type: 'ResetUiState' })
          }

          return { ...context, error: undefined, output, postcssRoot, postcssSource }
        } catch (err) {
          console.error(err)
          self.send({
            type: 'DisplayError',
            params: {
              title: 'Error',
              description: (err as Error)?.message,
            },
          })

          return { ...context, error: err as Error }
        }
      }),
    },
  },
)
