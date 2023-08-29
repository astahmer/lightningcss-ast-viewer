export interface LineColumn {
  line: number
  column: number
}

export class SourceText {
  private _text: string
  private _lines: string[]

  constructor(text: string) {
    this._text = text
    this._lines = text.split('\n')
  }

  get text() {
    return this._text
  }

  get lines() {
    return this._lines
  }

  getPosAtLineAndColumn(line: number, column: number, strict = true): number {
    const _line = strict ? line : line < 0 ? 0 : line >= this._lines.length ? this._lines.length - 1 : line
    const _column = strict
      ? column
      : column < 0
      ? 0
      : column > this._lines[_line].length
      ? this._lines[_line].length
      : column

    // Validation
    if (_line < 0 || _line >= this._lines.length) {
      throw new Error('Line number out of range.')
    }
    if (_column < 0 || _column > this._lines[_line].length) {
      throw new Error('Column number out of range.')
    }

    let index = 0

    // Add lengths of preceding lines
    for (let i = 0; i < _line; i++) {
      index += this._lines[i].length + 1 // +1 for newline character
    }

    // Add the column value
    index += _column

    return index
  }

  getLineAndColumnAtPos(index: number): LineColumn {
    let remaining = index
    let line, column

    for (line = 0; line < this._lines.length; line++) {
      if (remaining <= this._lines[line].length) {
        column = remaining
        break
      }
      // Subtract the current line length and the newline character from the remaining count
      remaining -= this._lines[line].length + 1
    }

    if (line === this._lines.length) {
      throw new Error('Index out of range.')
    }

    return { line, column } as LineColumn
  }

  extractRange(startLine: number, startCol: number, endLine: number, endCol: number): string {
    if (startLine === endLine) {
      return this._lines[startLine].slice(startCol, endCol)
    }

    const extractedLines: string[] = []
    extractedLines.push(this._lines[startLine].slice(startCol))

    for (let i = startLine + 1; i < endLine; i++) {
      extractedLines.push(this._lines[i])
    }

    extractedLines.push(this._lines[endLine].slice(0, endCol))
    return extractedLines.join('\n')
  }
}
