import { useEffect, useState } from 'react'
import { css } from '../../styled-system/css'
import { Bleed, Flex } from '../../styled-system/jsx'
import { css as cssLang } from '@codemirror/lang-css'
import CodeMirror from '@uiw/react-codemirror'

import { ObjectInspector } from 'react-inspector'
import { button, splitter } from '../../styled-system/recipes'
import {
  printNodeWithDetails,
  printNodeLoc,
  lightningTransform,
  LightningTransformResult,
  LightAstNode,
} from './transform'
import { useTheme } from '../vite-themes/provider'
import { useAtomValue } from 'jotai'
import { withDetailsAtom } from './atoms'
import { Splitter, SplitterPanel, SplitterResizeTrigger } from '../components/ui/splitter'
import { useToast } from '../components/ui/toast/use-toast'
import { UrlSaver } from './url-saver'
import { BottomTabs } from '../bottom-tabs'

const defaultResult: LightningTransformResult = { astNodes: new Set(), flatNodes: new Set(), css: '' }
// adapted from https://github.com/parcel-bundler/lightningcss/blob/393013928888d47ec7684d52ed79f758d371bd7b/website/playground/playground.js

// TODO voir output + custom visitors

const urlSaver = new UrlSaver()

export function Playground() {
  const [input, setInput] = useState(urlSaver.getValue('input') || sample.mediaQueries)
  const [output, setOutput] = useState(defaultResult)
  const [selected, setSelected] = useState<LightAstNode | undefined>()

  const { toast } = useToast()

  const update = (input: string) => {
    try {
      const result = lightningTransform(input)
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

  useEffect(() => {
    update(input)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const theme = useTheme()

  return (
    <Splitter
      direction="row"
      w="100%"
      height="100%"
      overflow="hidden"
      size={[
        { id: 'a', size: 33 },
        { id: 'b', size: 33 },
        { id: 'c', size: 33 },
      ]}
    >
      <SplitterPanel id="a">
        <Splitter
          size={[
            { id: 'editor', size: 50, minSize: 5 },
            { id: 'artifacts', size: 50 },
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

          <BottomTabs input={input} />
        </Splitter>
      </SplitterPanel>
      <SplitterResizeTrigger id="a:b" />
      <SplitterPanel id="b" py="2" px="5">
        <Flex w="100%" h="100%" direction="column" overflow="auto">
          <div className={css({ fontWeight: 'bold' })}>AST Nodes</div>
          {Array.from(output.astNodes).map((node, i) => (
            <NodeRow key={i} node={node} selected={selected} setSelected={setSelected} />
          ))}
        </Flex>
      </SplitterPanel>
      <SplitterResizeTrigger id="b:c" />
      <SplitterPanel id="c">
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
              expandPaths={[
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
              ]}
            />
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
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
