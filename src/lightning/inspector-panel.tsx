import { Segment, SegmentControl, SegmentGroup, SegmentGroupIndicator, SegmentLabel } from '@ark-ui/react'
import { json } from '@codemirror/lang-json'
import { ObjectInspector } from 'react-inspector'
import { css, cx } from '../../styled-system/css'
import { Flex } from '../../styled-system/jsx'
import { useTheme } from '../vite-themes/provider'

import CodeMirror from '@uiw/react-codemirror'
import { useState } from 'react'
import { segmentGroup } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'

type Tab = { id: string; label: string; children?: React.ReactNode }

const actionTabs = [
  { id: 'inspect', label: 'Inspect' },
  { id: 'json', label: 'JSON' },
] as const

const classes = segmentGroup()

export const InspectorPanel = ({
  data,
  expandPaths,
  children,
  css: cssProp,
  tabsProps,
  tabs = [],
  defaultValue = 'inspect',
}: {
  data: unknown | undefined
  expandPaths?: string[]
  children?: React.ReactNode
  css?: SystemStyleObject
  tabsProps?: SystemStyleObject
  tabs?: Tab[]
  defaultValue?: string
}) => {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState(defaultValue)

  const panelTabs = tabs.concat(actionTabs)
  const activeTabIndex = panelTabs.findIndex((tab) => tab.id === activeTab)

  return (
    <div
      className={css(
        {
          visibility: data ? 'visible' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%',
          overflow: 'hidden',
          w: '100%',
          h: '100%',
        },
        cssProp ?? {},
      )}
    >
      <Flex css={tabsProps}>
        {children}
        <SegmentGroup
          orientation="horizontal"
          className={cx(classes.root, css({ border: 'none' }))}
          defaultValue={defaultValue}
          onChange={(e) => setActiveTab(e.value)}
        >
          {panelTabs.map((option, id) => {
            return (
              <Segment key={id} value={option.id} className={classes.radio}>
                <SegmentControl className={classes.radioControl} />
                <SegmentLabel className={classes.radioLabel}>{option.label}</SegmentLabel>
              </Segment>
            )
          })}
          <SegmentGroupIndicator className={classes.indicator} />
        </SegmentGroup>
      </Flex>
      {activeTab === 'inspect' ? (
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
      ) : activeTab === 'json' ? (
        <div
          className={css({ height: '100%', width: '100%', overflow: 'auto', mt: 0.5, '& .cm-content': { pt: '0!' } })}
        >
          <CodeMirror
            width="100%"
            height="100%"
            className={css({ flex: 1, minHeight: '0', height: '100%' })}
            theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
            extensions={[json()]}
            value={safeStringify(data, 2)}
            readOnly
            basicSetup={{ lineNumbers: false }}
          />
        </div>
      ) : activeTabIndex > -1 ? (
        tabs[activeTabIndex].children
      ) : null}
    </div>
  )
}

const safeStringify = (obj: unknown, space: number) => {
  try {
    const seen = new Set()
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return
          }
          seen.add(value)
        }
        return value
      },
      space,
    )
  } catch (e) {
    return 'circular reference'
  }
}
