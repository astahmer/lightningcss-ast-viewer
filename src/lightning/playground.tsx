import { css as cssLang } from '@codemirror/lang-css'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { MutableRefObject, useRef, useState } from 'react'
import { css, cx } from '../../styled-system/css'
import { Bleed, Center, Flex, FlexProps } from '../../styled-system/jsx'

import { button, splitter } from '../../styled-system/recipes'
import { BottomTabs, OutputEditor } from '../bottom-tabs'
import { Splitter, SplitterPanel, SplitterResizeTrigger } from '../components/ui/splitter'
import { useToast } from '../components/ui/toast/use-toast'
import { useTheme } from '../vite-themes/provider'
import { LightningContextProvider, useLightningContext } from './context'

import { Decoration, EditorView } from '@codemirror/view'

import { useActorRef, useSelector } from '@xstate/react'
import postcss from 'postcss'
import { bleed, flex } from '../../styled-system/patterns'
import { highlightPlugin, highlighter } from '../codemirror/codemirror-highlight-plugin'
import { lineNumberStartFromZeroPlugin } from '../codemirror/codemirror-line-number-from-zero-plugin'
import { createPositionPlugin } from '../codemirror/codemirror-position-plugin'
import { Switch } from '../components/ui/switch'
import { InspectorPanel } from './inspector-panel'
import { getNodeWithPosFrom, getPostCSSNodeWithSourceFrom } from './node-location'
import {
  printNodeLoc,
  printNodeWithDetails,
  printPostCSSNodeLoc,
  printPostCSSNodeWithDetails,
} from './node-print-utils'
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
// TODO also highlight on hovering on AST nodes (different color), maybe do the opposite as well (highlight in AST when hovering in editor)

const scrollToLightNode = (node: LightAstNode) => {
  const lightNodeElement = document.querySelector(`span[data-light-node-id="${node.id}"]`)
  if (lightNodeElement) {
    lightNodeElement.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'center' })
  }
}

const scrollToEditorLine = (line: number, view: EditorView) => {
  const editorLine = view.state.doc.line(line)
  const coords = view.lineBlockAt(editorLine.from)
  const clientHeight = view.scrollDOM.clientHeight // Height of the visible part of the editor
  // Calculate the top position to center the line vertically
  const centeredTop = coords.top + (coords.bottom - coords.top) / 2 - clientHeight / 2
  view.scrollDOM.scrollTo({ top: centeredTop, behavior: 'instant' })
}

export function Playground() {
  const { toast } = useToast()
  const actor = useActorRef(
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
        onSelectNode({ event, context }) {
          if (!(event.type === 'SelectNode' || event.type === 'SelectPostCSSNode')) return

          // scroll in postcss inspector to the selected node
          if (event.type === 'SelectNode' && context.postcssSource && context.selectedPostCSSNode) {
            const index = context.postcssSource.getNodeIndex(context.selectedPostCSSNode)
            const postcsstNodeElement = document.querySelector(`span[data-postcss-node-id="${index}"]`)
            if (postcsstNodeElement) {
              postcsstNodeElement.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'center' })
            }
          }

          const node = context.selectedNode
          const view = editorRef.current?.view
          if (!node || !view) {
            return
          }

          if (event.type === 'SelectPostCSSNode') {
            scrollToLightNode(node)
          }

          resetHighlightMarks(view, context.input.length)

          const pos = node.pos
          if (!pos) return

          // highlight selected node text in editor
          const startPos = Math.max(
            0,
            context.output.source.getPosAtLineAndColumn(pos.start.line, pos.start.column - 1, false),
          )
          const endPos = Math.min(
            view.state.doc.length,
            context.output.source.getPosAtLineAndColumn(pos.end.line, pos.end.column, false),
          )
          // Add new mark
          view.dispatch({ effects: highlighter.addMarks.of([highlightMark.range(startPos, endPos)]) })
        },
      },
    }),
  )

  const editorRef = useRef<ReactCodeMirrorRef>()

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
        <InputColumn editorRef={editorRef} />
        <SplitterResizeTrigger id="input:ast" />
        <AstColumn editorRef={editorRef} />
        <SplitterResizeTrigger id="ast:inspector" />
        <InspectorColumn />
      </Splitter>
    </LightningContextProvider>
  )
}

const InputColumn = ({ editorRef }: { editorRef: MutableRefObject<ReactCodeMirrorRef | undefined> }) => {
  const actor = useLightningContext()
  const send = actor.send

  const source = useSelector(actor, (state) => state.context.output.source)
  const input = useSelector(actor, (state) => state.context.input)

  const theme = useTheme()
  // TODO update pos text on AST node selection
  const positionPluginRef = useRef<ReturnType<typeof createPositionPlugin>>()

  return (
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

                      const node = source.findNodeAtLocation(line.number - 1, column)
                      if (!node) {
                        // codemirror Calls to EditorView.update are not allowed while an update is in progress
                        setTimeout(() => {
                          resetHighlightMarks(view, input.length)
                        }, 0)
                        return
                      }

                      // codemirror Calls to EditorView.update are not allowed while an update is in progress
                      setTimeout(() => send({ type: 'SelectNode', params: { node } }), 0)

                      scrollToLightNode(node)
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
                  value={input}
                  onChange={(value) => send({ type: 'ChangeInput', params: { value } })}
                  extensions={
                    [cssLang(), highlightPlugin, lineNumberStartFromZeroPlugin, positionPluginRef.current].filter(
                      Boolean,
                    ) as any
                  }
                />
              </div>
            </Flex>

            {/* TODO convert that button to a select with a list of pre-defined samples */}
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
  )
}

const AstColumn = ({ editorRef }: { editorRef: MutableRefObject<ReactCodeMirrorRef | undefined> }) => {
  const actor = useLightningContext()
  const send = actor.send

  const nodes = useSelector(actor, (state) => state.context.output.nodes)
  const postcssRoot = useSelector(actor, (state) => state.context.postcssRoot)

  return (
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
          <Flex w="100%" h="100%" direction="column">
            <div className={flex({ fontWeight: 'bold' })}>
              <span>LightningCSS AST</span>
              <ShowDetails ml="auto" />
            </div>
            <Flex w="100%" h="100%" direction="column" overflow="auto">
              {Array.from(nodes).map((node, i) => (
                <LightNodeRow
                  key={i}
                  node={node}
                  setSelected={(node) => {
                    send({ type: 'SelectNode', params: { node } })

                    const view = editorRef.current?.view
                    const nodeWithPos = getNodeWithPosFrom(node)
                    if (view && nodeWithPos.pos) {
                      scrollToEditorLine(nodeWithPos.pos.start.line + 1, view)
                    }
                  }}
                />
              ))}
            </Flex>
          </Flex>
        </SplitterPanel>
        <SplitterResizeTrigger id="lightningcss:postcss" my="2" />
        <SplitterPanel id="postcss" border="none">
          {postcssRoot ? (
            <Flex w="100%" h="100%" overflow="auto">
              <InspectorPanel
                css={{ pt: 4 }}
                data={postcssRoot.toJSON()}
                expandPaths={['$', '$.nodes', '$.nodes.*']}
                defaultValue="ast"
                tabs={[
                  {
                    id: 'ast',
                    label: 'AST',
                    children: (
                      <Flex w="100%" h="100%" direction="column" overflow="auto">
                        {Array.from(postcssRoot.nodes).map((node, i) => (
                          <PostCSSNodeRow
                            key={i}
                            depth={0}
                            node={node}
                            setSelected={(node) => {
                              send({ type: 'SelectPostCSSNode', params: { node } })

                              // TODO scroll in lightcss inspector to the selected node

                              const view = editorRef.current?.view
                              const nodeWithPos = getPostCSSNodeWithSourceFrom(node)
                              if (view && nodeWithPos.source?.start?.line) {
                                scrollToEditorLine(nodeWithPos.source.start.line, view)
                              }
                            }}
                          />
                        ))}
                      </Flex>
                    ),
                  },
                ]}
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
  )
}

const InspectorColumn = () => {
  const actor = useLightningContext()

  const error = useSelector(actor, (state) => state.context.error)
  const selectedNode = useSelector(actor, (state) => state.context.selectedNode)
  const isInputBottomPanelOpen = useSelector(actor, (state) => state.context.ui.isInputBottomPanelOpen)
  const activeInputTab = useSelector(actor, (state) => state.context.ui.activeInputTab)

  return (
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
          {error ? (
            <Center fontSize="lg" p="4" textAlign="left" fontWeight="bold" color="red.400">
              {error.message}
            </Center>
          ) : selectedNode ? (
            <InspectorPanel
              css={{ pt: 4 }}
              tabsProps={{ px: 4 }}
              data={selectedNode}
              expandPaths={lightningCssExpandedPaths}
            >
              <div className={flex({ mr: 'auto', fontWeight: 'bold' })}>
                <span>{printNodeWithDetails(selectedNode)}</span>
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
          maxH={isInputBottomPanelOpen && activeInputTab === 'output' ? '0' : 'unset'}
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

const nodeRowName = css({
  display: 'inline-flex',
  alignSelf: 'baseline',
  alignItems: 'center',
  cursor: 'pointer',
  _selected: {
    fontWeight: 'bold',
    color: 'blue.400',
  },
  '&[data-with-children]': {
    ml: '-4',
  },
})

const nodeRowArrow = css({
  '&[data-no-children]': {
    display: 'none',
  },
  fontSize: 'xs',
  mt: '1',
  mr: '1',
  cursor: 'pointer',
})

const bleeding = bleed({ block: '0.25', pl: '8' })
const nodeRowRoot = flex({ direction: 'column', '&[data-with-parent]': { mt: 1 } })

const LightNodeRow = ({ node, setSelected }: { node: LightAstNode; setSelected: (node: LightAstNode) => void }) => {
  const actor = useLightningContext()
  const withDetails = useSelector(actor, (state) => state.context.ui.withTreeDetails)
  const selected = useSelector(actor, (state) => state.context.selectedNode)
  const isSelected = selected === node

  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={nodeRowRoot} data-light-node-id={node.id} data-with-parent={node.parent ? 1 : null}>
      <span
        className={nodeRowName}
        data-light-node-id={node.id}
        data-selected={isSelected ? 1 : null}
        data-with-children={node.children.length && node.depth}
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
          data-no-children={!node.children.length && node.depth ? 1 : null}
          onClickCapture={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={nodeRowArrow}
        >
          {isExpanded ? '▼' : '▶'}{' '}
        </span>
        {withDetails ? printNodeWithDetails(node) + ' ' + (printNodeLoc(node) ?? '') : node.type}
      </span>
      {isExpanded && node.children ? (
        <div className={bleeding}>
          {node.children.map((child, i) => (
            <LightNodeRow key={i} node={child} setSelected={setSelected} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const PostCSSNodeRow = ({
  node,
  depth,
  setSelected,
}: {
  node: postcss.Root | postcss.ChildNode
  depth: number
  setSelected: (node: postcss.Root | postcss.ChildNode) => void
}) => {
  const actor = useLightningContext()
  const withDetails = useSelector(actor, (state) => state.context.ui.withTreeDetails)

  const selectedPostcssNode = useSelector(actor, (state) => state.context.selectedPostCSSNode)
  const id = useSelector(actor, (state) => state.context.postcssSource?.getNodeIndex(node))
  const isSelected = selectedPostcssNode === node

  const [isExpanded, setIsExpanded] = useState(true)
  const children = 'nodes' in node ? node.nodes : undefined

  return (
    <div className={nodeRowRoot} data-postcss-node-id={id} data-with-parent={node.parent ? 1 : null}>
      <span
        className={nodeRowName}
        data-postcss-node-id={id}
        data-selected={isSelected ? 1 : null}
        data-with-children={children?.length && depth}
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
          data-no-children={!children?.length && depth ? 1 : null}
          onClickCapture={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={nodeRowArrow}
        >
          {isExpanded ? '▼' : '▶'}{' '}
        </span>
        {withDetails
          ? printPostCSSNodeWithDetails(node) + ' ' + (printPostCSSNodeLoc(node) ?? '')
          : node.constructor.name}
      </span>
      {isExpanded && children ? (
        <div className={bleeding}>
          {children.map((child, i) => (
            <PostCSSNodeRow key={i} depth={depth + 1} node={child} setSelected={setSelected} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
