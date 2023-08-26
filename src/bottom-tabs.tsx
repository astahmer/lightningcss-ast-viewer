import {
  Segment,
  SegmentControl,
  SegmentGroup,
  SegmentGroupIndicator,
  SegmentLabel,
  SplitterPanel,
  SplitterResizeTrigger,
} from '@ark-ui/react'
import { css as cssLang } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import CodeMirror from '@uiw/react-codemirror'
import { ChevronUpIcon } from 'lucide-react'
import React, { useEffect } from 'react'
import { css, cva } from '../styled-system/css'
import { Flex, styled as panda } from '../styled-system/jsx'
import { hstack } from '../styled-system/patterns'
import { useTheme } from './vite-themes/provider'
import { esbuildTransform } from './lightning/esbuild-transform'
import { useLightningContext } from './lightning/context'
import { urlSaver } from './lightning/url-saver'
import { useAtom } from 'jotai'
import { actionTabs, activeActionTabAtom } from './lightning/store'

export function BottomTabs() {
  const [open, setOpen] = React.useState(false)
  // const [activeTab, setActiveTab] = React.useState<(typeof tabs)[number]['id']>(tabs[0].id)
  const [activeTab, setActiveTab] = useAtom(activeActionTabAtom)
  const theme = useTheme()

  const [visitorsInput, setVisitorsInput] = React.useState(visitorSample)
  const { setVisitors } = useLightningContext()

  const update = async (value: string) => {
    setVisitorsInput(value)
    const code = await esbuildTransform(`(${value})()`)
    const mod = eval(code)
    console.log({ code, mod })

    setVisitors(mod)
    urlSaver.setValue('visitors', value)
  }

  // eval visitors on mount
  useEffect(() => {
    update(visitorsInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SplitterResizeTrigger id="editor:actions" asChild hidden={!open}>
        <div />
      </SplitterResizeTrigger>
      <SplitterPanel id="actions" className={actionsPanel({ open })}>
        <Flex
          w="full"
          h="12"
          cursor="pointer"
          px="6"
          py="2"
          align="center"
          justify="space-between"
          borderBottomWidth="1px"
          onClick={() => {
            setOpen(!open)
          }}
          zIndex={2}
        >
          <SegmentGroup
            orientation="horizontal"
            className={hstack()}
            data-expanded={open ? '' : undefined}
            value={activeTab}
            onClick={(e) => {
              if (open) e.stopPropagation()
            }}
            onChange={(e) => setActiveTab(e.value as never)}
          >
            {actionTabs.map((option, id) => {
              return (
                <Segment
                  key={id}
                  value={option.id}
                  data-expanded={open ? '' : undefined}
                  className={css(
                    {
                      zIndex: '1',
                      position: 'relative',
                      fontWeight: 'semibold',
                      color: { base: 'gray.600', _dark: 'primary' },
                      py: '1',
                      cursor: 'pointer',
                      px: 4,
                      rounded: 'md',
                      display: 'flex',
                      outline: { base: '1px solid rgba(125, 125, 125, 0.25)', _dark: 'none' },
                    },
                    !open ? { bg: { base: 'gray.300', _dark: 'gray.600' }, shadow: 'sm', rounded: 'md' } : {},
                  )}
                >
                  <SegmentControl />
                  <SegmentLabel>{option.label}</SegmentLabel>
                </Segment>
              )
            })}
            <SegmentGroupIndicator
              className={css({
                pointerEvents: 'none',
                background: { base: 'yellow.300', _dark: 'gray.600' },
                rounded: 'md',
              })}
            />
          </SegmentGroup>

          <panda.span
            data-expanded={open ? '' : undefined}
            transform={{ _expanded: 'rotate(180deg)' }}
            transition="all .2s ease"
            color={{ _expanded: { _dark: 'primary' } }}
          >
            <ChevronUpIcon />
          </panda.span>
        </Flex>
        {activeTab === 'output' && <OutputEditor />}
        {activeTab === 'visitors' && (
          <CodeMirror
            width="100%"
            height="100%"
            className={css({ flex: 1, minHeight: '0', height: '100%' })}
            theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
            extensions={[javascript()]}
            value={visitorsInput}
            onChange={update}
          />
        )}
      </SplitterPanel>
    </>
  )
}

export const OutputEditor = () => {
  const { output } = useLightningContext()
  const theme = useTheme()

  return (
    <CodeMirror
      width="100%"
      height="100%"
      className={css({ flex: 1, minHeight: '0', height: '100%' })}
      theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
      value={output.css}
      extensions={[cssLang()]}
      readOnly
    />
  )
}

const visitorSample =
  urlSaver.getValue('visitors') ||
  `function main () {
  const rules = []
  return {
    MediaQuery (mq) {
      console.log(mq)
    },
    Rule(rule) {
      rules.push(rule)
      console.log(rule.type)
    }
  }
}`

const actionsPanel = cva({
  base: {
    flexDir: 'column',
    minH: '12',
    background: { _dark: '#262626' },
    zIndex: '3',
  },
  variants: {
    open: {
      false: {
        maxH: '12',
        borderTopWidth: '1px',
      },
    },
  },
})
