import { css as cssLang } from '@codemirror/lang-css'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { useRef, useState } from 'react'
import { css, cx } from '../../styled-system/css'
import { Bleed, Center, Flex, FlexProps } from '../../styled-system/jsx'

import { button, splitter } from '../../styled-system/recipes'
import { BottomTabs, OutputEditor } from '../bottom-tabs'
import { Splitter, SplitterPanel, SplitterResizeTrigger } from '../components/ui/splitter'
import { useToast } from '../components/ui/toast/use-toast'
import { useTheme } from '../vite-themes/provider'
import { LightningContextProvider, useLightningContext } from './context'

import { Decoration, EditorView } from '@codemirror/view'

import { useActor, useSelector } from '@xstate/react'
import { flex } from '../../styled-system/patterns'
import { highlightPlugin, highlighter } from '../codemirror/codemirror-highlight-plugin'
import { lineNumberStartFromZeroPlugin } from '../codemirror/codemirror-line-number-from-zero-plugin'
import { createPositionPlugin } from '../codemirror/codemirror-position-plugin'
import { Switch } from '../components/ui/switch'
import { InspectorPanel } from './inspector-panel'
import { printNodeLoc, printNodeWithDetails } from './node-print-utils'
import { playgroundMachine } from './playground-machine'
import { sampleCss } from './sample-data'
import { LightAstNode } from './types'
import { getNodeWithPosFrom } from './node-location'

const positionStyle = css({
  mt: 'auto',
  p: '5px',
  w: '100%',
  backgroundColor: { base: '#f5f5f5', _dark: 'bg.subtle' },
  color: { base: '#333', _dark: '#ddd' },
  borderTop: { base: '1px solid #ddd', _dark: '1px solid #333' },
  textAlign: 'center',
})

const highlightMark = Decoration.mark({
  attributes: {
    class: cx(
      // _dark #6f7163
      css({ backgroundColor: { base: '#ffd991', _dark: 'black' } }),
      'lightningcss-highlight',
    ),
  },
})

const resetHighlightMarks = (view: EditorView, end: number) =>
  view.dispatch({ effects: highlighter.removeMarks(0, end) })

// adapted from https://github.com/parcel-bundler/lightningcss/blob/393013928888d47ec7684d52ed79f758d371bd7b/website/playground/playground.js

// TODO add linter

export function Playground() {
  const { toast } = useToast()
  const [state, send, actor] = useActor(
    playgroundMachine.provide({
      actions: {
        resetUiState: ({ context }) => {
          // reset highlight marks on output change
          const view = editorRef.current?.view
          if (view) {
            resetHighlightMarks(view, context.input.length)
          }
        },
        displayError: ({ event }) => {
          if (event.type !== 'DisplayError') return
          toast(event.params)
        },
      },
    }),
  )

  // TODO also highlight / scroll into view in PostCSS root
  const onSelectNode = (node: LightAstNode, view: EditorView) => {
    if (!node || !view) return

    resetHighlightMarks(view, state.context.input.length)

    const pos = node.pos
    if (!pos) return

    const startPos = Math.max(0, output.source.getPosAtLineAndColumn(pos.start.line, pos.start.column - 1, false))
    const endPos = Math.min(
      view.state.doc.length,
      output.source.getPosAtLineAndColumn(pos.end.line, pos.end.column, false),
    )
    // Add new mark
    view.dispatch({ effects: highlighter.addMarks.of([highlightMark.range(startPos, endPos)]) })
  }

  const { output } = state.context

  const theme = useTheme()
  const actionTab = state.context.ui.activeInputTab

  const editorRef = useRef<ReactCodeMirrorRef>()
  const positionPluginRef = useRef<ReturnType<typeof createPositionPlugin>>()

  return (
    <LightningContextProvider value={actor}>
      <Splitter
        flexDirection="row"
        w="100%"
        height="100%"
        overflow="hidden"
        size={[
          { id: 'input', size: 33 },
          { id: 'ast', size: 33 },
          { id: 'inspector', size: 33 },
        ]}
      >
        <SplitterPanel id="input">
          <Splitter
            size={[
              { id: 'editor', size: 50, minSize: 5 },
              { id: 'actions', size: 50 },
            ]}
            orientation="vertical"
            className={splitter().root}
          >
            <SplitterPanel id="editor">
              <Flex direction="column" w="100%" h="100%">
                <Flex
                  direction="column"
                  pos="relative"
                  minH="0"
                  h="100%"
                  ref={(ref) => {
                    if (ref)
                      positionPluginRef.current = createPositionPlugin({
                        container: ref,
                        className: positionStyle,
                        isZeroBased: true,
                        onUpdate: (update) => {
                          const view = update.view
                          const pos = view.state.selection.main.head
                          const line = view.state.doc.lineAt(pos)
                          const column = pos - line.from

                          const node = output.source.findNodeAtLocation(line.number - 1, column)
                          if (!node) {
                            // codemirror Calls to EditorView.update are not allowed while an update is in progress
                            setTimeout(() => {
                              resetHighlightMarks(view, state.context.input.length)
                            }, 0)
                            return
                          }

                          send({ type: 'SelectNode', params: { node } })
                          // // codemirror Calls to EditorView.update are not allowed while an update is in progress
                          setTimeout(() => onSelectNode(node, view), 0)

                          const nodeElement = document.querySelector(`span[data-node-id="${node.id}"]`)
                          if (nodeElement) {
                            nodeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' })
                          }
                        },
                      })
                  }}
                >
                  <div className={css({ pos: 'relative', minH: 0, overflow: 'auto', h: '100%' })}>
                    <CodeMirror
                      ref={(ref) => {
                        if (!ref) return
                        editorRef.current = ref
                        send({ type: 'Loaded' })
                      }}
                      width="100%"
                      height="100%"
                      className={css({ flex: 1, minHeight: '0', maxH: '100%', h: '100%' })}
                      theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
                      value={state.context.input}
                      onChange={(value) => send({ type: 'ChangeInput', params: { value } })}
                      extensions={
                        [cssLang(), highlightPlugin, lineNumberStartFromZeroPlugin, positionPluginRef.current].filter(
                          Boolean,
                        ) as any
                      }
                    />
                  </div>
                </Flex>

                <button
                  className={cx(button(), css({ flexShrink: 0 }))}
                  onClick={() => send({ type: 'ChangeInput', params: { value: sampleCss.mediaQueries } })}
                >
                  reset to sample
                </button>
              </Flex>
            </SplitterPanel>

            <BottomTabs />
          </Splitter>
        </SplitterPanel>
        <SplitterResizeTrigger id="input:ast" />
        <SplitterPanel id="ast" py="2" px="5">
          <Splitter
            size={[
              { id: 'lightningcss', size: 50, minSize: 3 },
              { id: 'postcss', size: 50, minSize: 5 },
            ]}
            orientation="vertical"
            className={splitter().root}
            gap="0"
          >
            <SplitterPanel id="lightningcss" border="none">
              <Flex w="100%" h="100%" direction="column" overflow="auto">
                <div className={flex({ fontWeight: 'bold' })}>
                  <span>LightningCSS AST</span>
                  <ShowDetails ml="auto" />
                </div>
                {Array.from(state.context.output.nodes).map((node, i) => (
                  <NodeRow
                    key={i}
                    node={node}
                    setSelected={(node) => {
                      send({ type: 'SelectNode', params: { node } })

                      const view = editorRef.current?.view
                      const nodeWithPos = getNodeWithPosFrom(node)
                      if (view) {
                        onSelectNode(nodeWithPos, view)

                        if (nodeWithPos.pos) {
                          const editorLine = view.state.doc.line(nodeWithPos.pos.start.line + 1)
                          const coords = view.lineBlockAt(editorLine.from)
                          const clientHeight = view.scrollDOM.clientHeight // Height of the visible part of the editor
                          // Calculate the top position to center the line vertically
                          const centeredTop = coords.top + (coords.bottom - coords.top) / 2 - clientHeight / 2
                          view.scrollDOM.scrollTo({ top: centeredTop, behavior: 'smooth' })
                        }
                      }
                    }}
                  />
                ))}
              </Flex>
            </SplitterPanel>
            <SplitterResizeTrigger id="lightningcss:postcss" my="2" />
            <SplitterPanel id="postcss" border="none">
              {state.context.postcssRoot ? (
                <Flex w="100%" h="100%" overflow="auto">
                  <InspectorPanel
                    css={{ pt: 4 }}
                    data={state.context.postcssRoot.toJSON()}
                    expandPaths={['$', '$.nodes', '$.nodes.*']}
                  >
                    <div className={flex({ mr: 'auto', fontWeight: 'bold' })}>
                      <span>PostCSS</span>
                    </div>
                  </InspectorPanel>
                </Flex>
              ) : null}
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
        <SplitterResizeTrigger id="ast:inspector" />
        <SplitterPanel id="inspector">
          <Splitter
            orientation="vertical"
            w="100%"
            height="100%"
            overflow="hidden"
            size={[
              { id: 'json', size: 66, minSize: 10 },
              { id: 'output', size: 33 },
            ]}
          >
            <SplitterPanel id="json" border="none">
              {/* TODO add AST view ? */}
              {state.context.error ? (
                <Center fontSize="lg" p="4" textAlign="left" fontWeight="bold" color="red.400">
                  {state.context.error.message}
                </Center>
              ) : state.context.selectedNode ? (
                <InspectorPanel
                  css={{ pt: 4 }}
                  tabsProps={{ px: 4 }}
                  data={state.context.selectedNode}
                  expandPaths={lightningCssExpandedPaths}
                >
                  <div className={flex({ mr: 'auto', fontWeight: 'bold' })}>
                    <span>{printNodeWithDetails(state.context.selectedNode)}</span>
                  </div>
                </InspectorPanel>
              ) : (
                <Center fontSize="xl" p="4" textAlign="center" fontWeight="bold">
                  Select a LightningCSS AST node to inspect it...
                </Center>
              )}
            </SplitterPanel>
            <SplitterResizeTrigger id="json:output" />
            <SplitterPanel
              id="output"
              border="none"
              maxH={state.context.ui.isInputBottomPanelOpen && actionTab === 'output' ? '0' : 'unset'}
            >
              <Flex direction="column" w="100%" h="100%" overflow="auto">
                <div className={flex({ ml: '4', py: '2', mr: 'auto', fontWeight: 'bold' })}>
                  <span>Output</span>
                </div>
                <OutputEditor />
              </Flex>
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
      </Splitter>
    </LightningContextProvider>
  )
}

const ShowDetails = (props?: FlexProps) => {
  const actor = useLightningContext()

  return (
    <Flex {...(props as FlexProps)} alignItems="center" gap="2">
      <Switch id="show-details" color="red" onClick={() => actor.send({ type: 'ToggleTreeDetails' })} />
      <label htmlFor="show-details">Show details</label>
    </Flex>
  )
}

const lightningCssExpandedPaths = [
  '$',
  '$.pos',
  '$.pos.*',
  '$.data',
  '$.data.*',
  '$.data.*.children',
  '$.data.*.children.*',
  '$.data.*.*.children',
  '$.data.*.*.children.*',
  '$.data.*.loc',
  '$.data.*.loc.*',
  '$.data.*.*.loc',
  '$.data.*.*.loc.*',
]

const NodeRow = ({ node, setSelected }: { node: LightAstNode; setSelected: (node: LightAstNode) => void }) => {
  const actor = useLightningContext()
  const withDetails = useSelector(actor, (state) => state.context.ui.withTreeDetails)
  const selected = useSelector(actor, (state) => state.context.selectedNode)

  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <Flex direction="column" mt={node.parent ? undefined : '1'} data-node-id={node.id}>
      <span
        className={css({
          display: 'inline-flex',
          alignSelf: 'baseline',
          alignItems: 'center',
          cursor: 'pointer',
          fontWeight: node === selected ? 'bold' : undefined,
          color: node === selected ? 'blue.400' : undefined,
          ml: node.children.length && node.depth ? '-4' : undefined,
        })}
        onClick={(e) => {
          console.log(node)
          e.stopPropagation()
          return setSelected(node)
        }}
        onDoubleClick={() => {
          setIsExpanded(!isExpanded)
        }}
      >
        <span
          data-node-id={node.id}
          onClickCapture={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={css({
            display: node.children.length ? undefined : 'none',
            fontSize: 'xs',
            mt: '1',
            mr: '1',
            cursor: 'pointer',
          })}
        >
          {isExpanded ? '▼' : '▶'}{' '}
        </span>
        {withDetails ? printNodeWithDetails(node) + ' ' + (printNodeLoc(node) ?? '') : node.type}
      </span>
      {isExpanded && node.children ? (
        <Bleed block="0.5" pl="8">
          {node.children.map((child, i) => (
            <NodeRow key={i} node={child} setSelected={setSelected} />
          ))}
        </Bleed>
      ) : null}
    </Flex>
  )
}
