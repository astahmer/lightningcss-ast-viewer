import { css as cssLang } from '@codemirror/lang-css'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useState } from 'react'
import { css } from '../../styled-system/css'
import { Bleed, Flex } from '../../styled-system/jsx'

import { useAtomValue } from 'jotai'
import { ObjectInspector } from 'react-inspector'
import { button, splitter } from '../../styled-system/recipes'
import { BottomTabs, OutputEditor } from '../bottom-tabs'
import { Splitter, SplitterPanel, SplitterResizeTrigger } from '../components/ui/splitter'
import { useToast } from '../components/ui/toast/use-toast'
import { useTheme } from '../vite-themes/provider'
import { LightningContextProvider } from './context'
import {
  LightAstNode,
  LightVisitors,
  LightningTransformResult,
  lightningTransform,
  printNodeLoc,
  printNodeWithDetails,
} from './light-transform'
import { activeActionTabAtom, withDetailsAtom } from './store'
import { urlSaver } from './url-saver'

import { useSetAtom } from 'jotai'
import { flex } from '../../styled-system/patterns'
import { SystemStyleObject } from '../../styled-system/types'
import { Switch } from '../components/ui/switch'

const defaultResult: LightningTransformResult = { astNodes: new Set(), flatNodes: new Set(), css: '' }
// adapted from https://github.com/parcel-bundler/lightningcss/blob/393013928888d47ec7684d52ed79f758d371bd7b/website/playground/playground.js

export function Playground() {
  const [input, setInput] = useState(initialInput)
  const [output, setOutput] = useState(defaultResult)
  const [selected, setSelected] = useState<LightAstNode | undefined>()
  const [visitors, setVisitors] = useState<LightVisitors>({})

  const { toast } = useToast()

  const update = (input: string) => {
    try {
      const result = lightningTransform(input, { visitor: visitors })
      setOutput(result)
      console.log(result)
      urlSaver.setValue('input', input)
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
              <Flex direction="column" w="100%" h="100%" overflow="auto">
                <CodeMirror
                  width="100%"
                  height="100%"
                  className={css({ flex: 1, minHeight: '0' })}
                  theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
                  value={input}
                  onChange={(value) => {
                    setInput(value)
                    return update(value ?? '')
                  }}
                  extensions={[cssLang()]}
                />

                <button
                  className={button({})}
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
          <Flex w="100%" h="100%" direction="column" overflow="auto">
            <div className={flex({ fontWeight: 'bold' })}>
              <span>AST Nodes</span>
              <ShowDetails ml="auto" />
            </div>
            {Array.from(output.astNodes).map((node, i) => (
              <NodeRow key={i} node={node} selected={selected} setSelected={setSelected} />
            ))}
          </Flex>
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
              <InspecterPanel selected={selected} />
            </SplitterPanel>
            <SplitterPanel id="output" display={actionTab === 'output' ? 'none' : 'unset'}>
              <OutputEditor />
            </SplitterPanel>
          </Splitter>
        </SplitterPanel>
      </Splitter>
    </LightningContextProvider>
  )
}

const ShowDetails = (props?: SystemStyleObject) => {
  const setWithDetails = useSetAtom(withDetailsAtom)

  return (
    <Flex {...(props as any)} alignItems="center" gap="2">
      <Switch id="show-details" color="red" onClick={() => setWithDetails((c) => !c)} />
      <label htmlFor="show-details">Show details</label>
    </Flex>
  )
}

const expandedPaths = [
  '$',
  '$.*',
  '$.*.*',
  '$.*.*.children',
  '$.*.*.children.*',
  '$.*.*.*.children',
  '$.*.*.*.children.*',
  '$.*.*.loc',
  '$.*.*.loc.*',
  '$.*.*.*.loc',
  '$.*.*.*.loc.*',
]
const InspecterPanel = ({ selected }: { selected: LightAstNode | undefined }) => {
  const theme = useTheme()

  return (
    <div
      className={css({
        visibility: selected ? 'visible' : 'hidden',
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
          data={selected}
          expandPaths={expandedPaths}
        />
      </div>
    </div>
  )
}

const NodeRow = ({
  node,
  selected,
  setSelected,
}: {
  node: LightAstNode
  selected: LightAstNode | undefined
  setSelected: (node: LightAstNode) => void
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
        })}
        onClickCapture={(e) => {
          console.log(node)
          e.stopPropagation()
          return setSelected(node)
        }}
      >
        <span className={css({ display: node.children.length ? undefined : 'none', fontSize: 'xs', mt: '1', mr: '1' })}>
          ▼{' '}
        </span>
        {withDetails ? printNodeWithDetails(node) + ' ' + (printNodeLoc(node) ?? '') : node.type}
      </span>
      {node.children ? (
        <Bleed block="0.5" pl="4">
          {node.children.map((child, i) => (
            <NodeRow key={i} node={child} selected={selected} setSelected={setSelected} />
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
