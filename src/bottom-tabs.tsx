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
import CodeMirror from '@uiw/react-codemirror'
import { ChevronUpIcon } from 'lucide-react'
import React from 'react'
import { css, cva } from '../styled-system/css'
import { Flex, styled as panda } from '../styled-system/jsx'
import { flex } from '../styled-system/patterns'
import { useTheme } from './vite-themes/provider'

const tabs = [
  { id: 'output', label: 'Output' },
  { id: 'visitors', label: 'Visitors' },
]

export function BottomTabs({ input }: { input: string }) {
  const [open, setOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState(tabs[0].id)
  const theme = useTheme()

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
          onClick={() => setOpen((s) => !s)}
          zIndex={2}
        >
          <SegmentGroup
            orientation="horizontal"
            className={flex()}
            data-expanded={open ? '' : undefined}
            value={activeTab}
            onClick={(e) => {
              if (open) e.stopPropagation()
            }}
            onChange={(e) => setActiveTab(e.value)}
          >
            {tabs.map((option, id) => {
              return (
                <Segment
                  key={id}
                  value={option.id}
                  data-expanded={open ? '' : undefined}
                  className={css({
                    zIndex: '1',
                    position: 'relative',
                    fontWeight: 'semibold',
                    color: { base: '#778597', _dark: '#FFFFFF4D' },
                    py: '1',
                    cursor: 'pointer',
                    px: 4,
                    rounded: 'md',
                    display: 'flex',
                  })}
                >
                  <SegmentControl />
                  <SegmentLabel>{option.label}</SegmentLabel>
                </Segment>
              )
            })}
            <SegmentGroupIndicator className={css({ pointerEvents: 'none', background: 'text.main', rounded: 'md' })} />
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
        {activeTab === 'output' && (
          <CodeMirror
            width="100%"
            height="100%"
            className={css({ flex: 1, minHeight: '0' })}
            theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
            value={input}
            extensions={[cssLang()]}
            readOnly
          />
        )}
      </SplitterPanel>
    </>
  )
}

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
