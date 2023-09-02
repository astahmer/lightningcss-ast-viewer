import {
  Segment,
  SegmentControl,
  SegmentGroup,
  SegmentGroupIndicator,
  SegmentLabel,
  SplitterPanel,
} from '@ark-ui/react'
import { css as cssLang } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import CodeMirror from '@uiw/react-codemirror'
import { useSelector } from '@xstate/react'
import { ChevronUpIcon } from 'lucide-react'
import React, { useEffect } from 'react'
import { css, cva } from '../styled-system/css'
import { Flex, styled as panda } from '../styled-system/jsx'
import { hstack } from '../styled-system/patterns'
import { esbuildTransform } from './lib/esbuild-transform'
import { urlSaver } from './lib/url-saver'
import { useLightningContext } from './lightning/context'
import { useTheme } from './vite-themes/provider'

const actionTabs = [
  { id: 'output', label: 'Output' },
  { id: 'visitors', label: 'Visitors' },
] as const

export function BottomTabs() {
  const theme = useTheme()
  const [visitorsInput, setVisitorsInput] = React.useState(visitorSample)

  const actor = useLightningContext()
  const send = actor.send

  const context = useSelector(actor, (state) => state.context)
  const [isOpen, toggle] = [context.ui.isInputBottomPanelOpen, () => send({ type: 'ToggleBottomPanel' })]

  const activeTab = context.ui.activeInputTab

  const update = async (value: string) => {
    setVisitorsInput(value)
    const code = await esbuildTransform(`(${value})()`)
    const mod = eval(code)

    send({ type: 'ChangeVisitors', params: { visitors: mod } })
    urlSaver.setValue('visitors', value)
  }

  // eval visitors on mount
  useEffect(() => {
    update(visitorsInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SplitterPanel id="actions" className={actionsPanel({ open: isOpen })}>
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
            toggle()
          }}
          zIndex={2}
        >
          <SegmentGroup
            orientation="horizontal"
            className={hstack()}
            data-expanded={isOpen ? '' : undefined}
            value={activeTab}
            onClick={(e) => {
              if (isOpen) e.stopPropagation()
            }}
            onChange={(e) => send({ type: 'SetActiveInputTab', params: { tab: e.value as never } })}
          >
            {actionTabs.map((option, id) => {
              return (
                <Segment
                  key={id}
                  value={option.id}
                  data-expanded={isOpen ? '' : undefined}
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
                    !isOpen ? { bg: { base: 'gray.300', _dark: 'gray.600' }, shadow: 'sm', rounded: 'md' } : {},
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
            data-expanded={isOpen ? '' : undefined}
            transform={{ _expanded: 'rotate(180deg)' }}
            transition="all .2s ease"
            color={{ _expanded: { _dark: 'primary' } }}
          >
            <ChevronUpIcon />
          </panda.span>
        </Flex>
        {activeTab === 'output' && (
          // <div className={css({ flex: 1, minHeight: '0', height: '100%', overflow: 'auto' })}>
          <OutputEditor />
          // </div>
        )}
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
  const actor = useLightningContext()
  const output = useSelector(actor, (state) => state.context.output)
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
    Color(color) {
      if (color.type === 'rgb') {
        color.g = 0;
        return color;
      }
    }
  }
}`

const actionsPanel = cva({
  base: {
    display: 'flex',
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
