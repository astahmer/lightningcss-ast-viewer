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

import { Decoration } from '@codemirror/view'

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

const positionStyle = css({
  mt: 'auto',
  p: '5px',
  w: '100%',
  backgroundColor: { base: '#f5f5f5', _dark: 'bg.subtle' },
  color: { base: '#333', _dark: '#ddd' },
  borderTop: { base: '1px solid #ddd', _dark: '1px solid #333' },
  textAlign: 'center',
})

// adapted from https://github.com/parcel-bundler/lightningcss/blob/393013928888d47ec7684d52ed79f758d371bd7b/website/playground/playground.js

// TODO add linter
// TODO click in input -> select AST node + display in inspector

export function Playground() {
  const { toast } = useToast()
  const [state, send, actor] = useActor(
    playgroundMachine.provide({
      actions: {
        resetUiState: ({ context }) => {
          // reset highlight marks on output change
          const view = editorRef.current?.view
          if (view) {
            view.dispatch({ effects: highlighter.removeMarks(0, context.input.length) })
          }
        },
        displayError: ({ event }) => {
          if (event.type !== 'DisplayError') return
          toast(event.params)
        },
      },
    }),
  )

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
                    if (ref) positionPluginRef.current = createPositionPlugin(ref, positionStyle, true)
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
                    selected={state.context.selectedNode}
                    setSelected={(node) => {
                      send({ type: 'SelectNode', params: { node } })

                      const pos = node.pos
                      if (!pos) return

                      if (editorRef.current) {
                        const highlightMark = Decoration.mark({
                          attributes: {
                            class: cx(
                              // _dark #6f7163
                              css({ backgroundColor: { base: '#ffd991', _dark: 'black' } }),
                              'lightningcss-highlight',
                            ),
                          },
                        })
                        const view = editorRef.current?.view
                        if (view) {
                          const startPos = output.source.getPosAtLineAndColumn(
                            pos.start.line,
                            pos.start.column - 1,
                            false,
                          )
                          const endPos = output.source.getPosAtLineAndColumn(pos.end.line, pos.end.column, false)

                          // Reset all marks
                          view.dispatch({ effects: highlighter.removeMarks(0, state.context.input.length) })
                          // Add new mark
                          view.dispatch({ effects: highlighter.addMarks.of([highlightMark.range(startPos, endPos)]) })
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

const NodeRow = ({
  node,
  selected,
  setSelected,
  depth = 0,
}: {
  node: LightAstNode
  selected: LightAstNode | undefined
  setSelected: (node: LightAstNode) => void
  depth?: number
}) => {
  const actor = useLightningContext()
  const withDetails = useSelector(actor, (state) => state.context.ui.withTreeDetails)

  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <Flex direction="column" mt={node.parent ? undefined : '1'}>
      <span
        className={css({
          display: 'inline-flex',
          alignSelf: 'baseline',
          alignItems: 'center',
          cursor: 'pointer',
          fontWeight: node === selected ? 'bold' : undefined,
          ml: node.children.length && depth ? '-4' : undefined,
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
            <NodeRow key={i} node={child} selected={selected} setSelected={setSelected} depth={depth + 1} />
          ))}
        </Bleed>
      ) : null}
    </Flex>
  )
}
