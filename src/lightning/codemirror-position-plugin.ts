import { EditorView, ViewPlugin, WidgetType } from '@codemirror/view'

class PositionWidget extends WidgetType {
  root: HTMLElement
  textElement: HTMLElement

  constructor() {
    super()
    this.root = document.createElement('div')
    this.textElement = document.createElement('span')
    this.root.appendChild(this.textElement)
  }

  toDOM(view: EditorView) {
    const pos = view.state.selection.main.head
    const line = view.state.doc.lineAt(pos)
    this.textElement.textContent = `Line: ${line.number}, Col: ${pos - line.from}, Index: ${pos}`
    return this.root
  }
}

export const createPositionPlugin = (container: HTMLElement, className: string) =>
  ViewPlugin.define((view) => {
    const widget = new PositionWidget()
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
