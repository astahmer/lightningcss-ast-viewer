import { lineNumbers } from '@codemirror/view'

function createLineNumberFromZeroPlugin() {
  return lineNumbers({
    formatNumber: (lineNo) => {
      return String(lineNo - 1)
    },
  })
}

export const lineNumberStartFromZeroPlugin = createLineNumberFromZeroPlugin()
