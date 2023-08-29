import { css as cssLang } from '@codemirror/lang-css'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { useEffect, useRef, useState } from 'react'
import { css, cx } from '../../styled-system/css'
import { Bleed, Center, Flex, FlexProps } from '../../styled-system/jsx'

import { useAtomValue } from 'jotai'
import * as postcss from 'postcss'
import { ObjectInspector } from 'react-inspector'
import { button, splitter } from '../../styled-system/recipes'
import { BottomTabs, OutputEditor } from '../bottom-tabs'
import { Splitter, SplitterPanel, SplitterResizeTrigger } from '../components/ui/splitter'
import { useToast } from '../components/ui/toast/use-toast'
import { useTheme } from '../vite-themes/provider'
import { LightningContextProvider } from './context'
import { lightningTransform } from './light-transform'
import { activeActionTabAtom, withDetailsAtom } from './store'
import { urlSaver } from './url-saver'

import { Decoration } from '@codemirror/view'

import { useSetAtom } from 'jotai'
import { flex } from '../../styled-system/patterns'
import { Switch } from '../components/ui/switch'
import { highlightPlugin, highlighter } from './codemirror-highlight-plugin'
import { lineNumberStartFromZeroPlugin } from './codemirror-line-number-from-zero-plugin'
import { createPositionPlugin } from './codemirror-position-plugin'
import { printNodeLoc, printNodeWithDetails } from './print-utils'
import { LightAstNode, LightVisitors, LightningTransformResult } from './types'

const positionStyle = css({
  mt: 'auto',
  p: '5px',
  w: '100%',
  backgroundColor: { base: '#f5f5f5', _dark: 'bg.subtle' },
  color: { base: '#333', _dark: '#ddd' },
  borderTop: { base: '1px solid #ddd', _dark: '1px solid #333' },
  textAlign: 'center',
})

const defaultResult: LightningTransformResult = { nodes: new Set(), flatNodes: new Set(), css: '', source: {} as any }
// adapted from https://github.com/parcel-bundler/lightningcss/blob/393013928888d47ec7684d52ed79f758d371bd7b/website/playground/playground.js

// TODO add linter

export function Playground() {
  const [input, setInput] = useState(initialInput)
  const [output, setOutput] = useState(defaultResult)
  const [postcssRoot, setPostcssRoot] = useState<postcss.Root | undefined>()
  const [selected, setSelected] = useState<LightAstNode | undefined>()
  const [visitors, setVisitors] = useState<LightVisitors>({})

  const { toast } = useToast()

  const update = (input: string) => {
    try {
      const result = lightningTransform(input, { visitor: visitors })
      setOutput(result)
      const postcssResult = postcss.parse(input)
      setPostcssRoot(postcssResult)
      console.log(result, postcssResult)
      urlSaver.setValue('input', input)

      // reset selected on output change
      if (result.css !== output.css) {
        setSelected(undefined)

        // reset highlight marks on output change
        const view = editorRef.current?.view
        if (view) {
          view.dispatch({ effects: highlighter.removeMarks(0, input.length) })
        }
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Error',
        description: (err as Error)?.message,
      })
    }
  }

  // run transform on mount
  useEffect(() => {
    update(input)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitors])

  const theme = useTheme()
  const actionTab = useAtomValue(activeActionTabAtom)

  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const positionPluginRef = useRef<ReturnType<typeof createPositionPlugin>>()

  return (
    <LightningContextProvider value={{ input, output, setInput, setOutput, visitors, setVisitors, update }}>
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
                    if (ref) positionPluginRef.current = createPositionPlugin(ref, positionStyle)
                  }}
                >
                  <div className={css({ pos: 'relative', minH: 0, overflow: 'auto', h: '100%' })}>
                    <CodeMirror
                      ref={editorRef}
                      width="100%"
                      height="100%"
                      className={css({ flex: 1, minHeight: '0', maxH: '100%', h: '100%' })}
                      theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
                      value={input}
                      onChange={(value) => {
                        setInput(value)
                        return update(value ?? '')
                      }}
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
                  onClick={() => {
                    setInput(sample.mediaQueries)
                    return update(sample.mediaQueries)
                  }}
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
              { id: 'postcss', size: 50, minSize: 3 },
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
                {Array.from(output.nodes).map((node, i) => (
                  <NodeRow
                    key={i}
                    node={node}
                    selected={selected}
                    setSelected={(node) => {
                      setSelected(node)

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
                          const endPos = output.source.getPosAtLineAndColumn(pos.end.line, pos.end.column - 1, false)

                          // Reset all marks
                          view.dispatch({ effects: highlighter.removeMarks(0, input.length) })
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
              {postcssRoot ? (
                <Flex w="100%" h="100%" direction="column" overflow="auto">
                  <div className={flex({ fontWeight: 'bold' })}>
                    <span>PostCSS root</span>
                  </div>
                  <InspectorPanel data={postcssRoot.toJSON()} expandPaths={['$', '$.nodes', '$.nodes.*']} />
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
              { id: 'json', size: 66 },
              { id: 'output', size: 33 },
            ]}
          >
            <SplitterPanel id="json">
              {/* TODO add AST view ? */}
              {selected ? (
                <InspectorPanel data={selected} expandPaths={lightningCssExpandedPaths} />
              ) : (
                <Center fontSize="xl" p="4" textAlign="center" fontWeight="bold">
                  Select a LightningCSS AST node to display it...
                </Center>
              )}
            </SplitterPanel>
            {/* TODO add resize trigger + rm border */}
            <SplitterPanel id="output" display={actionTab === 'output' ? 'none' : 'unset'}>
              <OutputEditor />
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
      </Splitter>
    </LightningContextProvider>
  )
}

const ShowDetails = (props?: FlexProps) => {
  const setWithDetails = useSetAtom(withDetailsAtom)

  return (
    <Flex {...(props as FlexProps)} alignItems="center" gap="2">
      <Switch id="show-details" color="red" onClick={() => setWithDetails((c) => !c)} />
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

// TODO add Tabs: Inspector (or name prop) / JSON tab = raw json file, no inspector
const InspectorPanel = ({ data, expandPaths }: { data: unknown | undefined; expandPaths?: string[] }) => {
  const theme = useTheme()

  return (
    <div
      className={css({
        visibility: data ? 'visible' : 'hidden',
        display: 'flex',
        maxHeight: '100%',
        overflow: 'hidden',
        w: '100%',
        h: '100%',
      })}
    >
      <div
        className={css({
          height: '100%',
          width: '100%',
          overflow: 'auto',
          '& > ol': {
            display: 'flex',
            height: '100%',
            width: '100%',
            '& > li': {
              width: '100%',
              px: '5!',
              py: '5!',
            },
            '& span': {
              fontSize: 'xs',
            },
          },
        })}
      >
        <ObjectInspector
          theme={theme.resolvedTheme === 'dark' ? 'chromeDark' : undefined}
          data={data}
          expandPaths={expandPaths}
        />
      </div>
    </div>
  )
}

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
  const withDetails = useAtomValue(withDetailsAtom)

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
        onClickCapture={(e) => {
          console.log(node)
          e.stopPropagation()
          return setSelected(node)
        }}
      >
        <span
          className={css({
            display: node.children.length ? undefined : 'none',
            fontSize: 'xs',
            mt: '1',
            mr: '1',
          })}
        >
          {/* TODO make it clickable, collapse/expand children */}▼{' '}
        </span>
        {withDetails ? printNodeWithDetails(node) + ' ' + (printNodeLoc(node) ?? '') : node.type}
      </span>
      {node.children ? (
        <Bleed block="0.5" pl="8">
          {node.children.map((child, i) => (
            <NodeRow key={i} node={child} selected={selected} setSelected={setSelected} depth={depth + 1} />
          ))}
        </Bleed>
      ) : null}
    </Flex>
  )
}

const sample = {
  mediaQueries: `@media (min-width: 990px) {
  .bg {
    background-color: yellow;
  }
}

.bg {
  background-color: red;
}

@media (max-width: 1290px) {
  .bg {
    background-color: yellow;
  }
}

@media (min-width: 640px) {
  .bg {
    background-color: blue;
  }
}
`,
}

const initialInput = urlSaver.getValue('input') || sample.mediaQueries
