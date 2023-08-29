import { Range, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'

const addMarks = StateEffect.define<Range<Decoration>[]>()
const filterMarks = StateEffect.define<(from: number, to: number) => boolean>()

export const highlighter = {
  addMarks,
  filterMarks,
  removeMarks: (start: number, end: number) => filterMarks.of((from, to) => to <= start || from >= end),
}

// This value must be added to the set of extensions to enable this
export const highlightPlugin = StateField.define({
  // Start with an empty set of decorations
  create() {
    return Decoration.none
  },
  // This is called whenever the editor updates—it computes the new set
  update(value, tr) {
    // Move the decorations to account for document changes
    value = value.map(tr.changes)
    // If this transaction adds or removes decorations, apply those changes
    for (const effect of tr.effects) {
      if (effect.is(addMarks)) value = value.update({ add: effect.value!, sort: true })
      else if (effect.is(filterMarks)) value = value.update({ filter: effect.value! })
    }
    return value
  },
  // Indicate that this field provides a set of decorations
  provide: (f) => EditorView.decorations.from(f),
})
