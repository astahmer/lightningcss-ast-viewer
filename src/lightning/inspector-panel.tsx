import { css } from '../../styled-system/css'
import { ObjectInspector } from 'react-inspector'
import { useTheme } from '../vite-themes/provider'

// TODO add Tabs: Inspector (or name prop) / JSON tab = raw json file, no inspector
export const InspectorPanel = ({ data, expandPaths }: { data: unknown | undefined; expandPaths?: string[] }) => {
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
