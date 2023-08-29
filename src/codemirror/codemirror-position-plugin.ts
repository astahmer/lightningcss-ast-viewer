import { EditorView, ViewPlugin, WidgetType } from '@codemirror/view'

class PositionWidget extends WidgetType {
  root: HTMLElement
  textElement: HTMLElement
  isZeroBased: boolean

  constructor(isZeroBased = false) {
    super()
    this.isZeroBased = isZeroBased
    this.root = document.createElement('div')
    this.textElement = document.createElement('span')
    this.root.appendChild(this.textElement)
  }

  toDOM(view: EditorView) {
    const pos = view.state.selection.main.head
    const line = view.state.doc.lineAt(pos)
    this.textElement.textContent = `Line: ${line.number - (this.isZeroBased ? 1 : -1)}, Col: ${
      pos - line.from
    }, Index: ${pos}`
    return this.root
  }
}

export const createPositionPlugin = (container: HTMLElement, className: string, isZeroBased = false) =>
  ViewPlugin.define((view) => {
    const widget = new PositionWidget(isZeroBased)
    if (className) {
      widget.toDOM(view).classList.add(...className.split(' '))
    }

    if (container) {
      container.appendChild(widget.toDOM(view))
    }

    return {
      update(update) {
        if (update.selectionSet || update.docChanged) {
          widget.toDOM(update.view)
        }
      },
      destroy() {
        widget.root.remove()
      },
    }
  })
