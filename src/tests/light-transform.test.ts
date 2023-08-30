import { expect, test } from 'vitest'

import { lightningTransform } from '../lightning/light-transform'
import { pick } from 'pastable'
import outdent from 'outdent'

test('lightningTransform - lightningcss.dev sample', async () => {
  const code = outdent`@custom-media --modern (color), (hover);

    .foo {
      background: yellow;

      -webkit-border-radius: 2px;
      -moz-border-radius: 2px;
      border-radius: 2px;

      -webkit-transition: background 200ms;
      -moz-transition: background 200ms;
      transition: background 200ms;

      &.bar {
        color: green;
      }
    }

    @media (--modern) and (width > 1024px) {
      .a {
        color: green;
      }
    }`

  const result = lightningTransform(code)
  expect(
    Array.from(result.nodes).map((n) =>
      Object.assign(pick(n, ['type', 'pos', 'depth', 'text']), {
        prev: n.prev?.type,
        next: n.prev?.type,
        prevSibling: n.prevSibling?.type,
        nextSibling: n.nextSibling?.type,
        parent: n.parent?.type,
        children: n.children.map((c) => c.type),
      }),
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "children": [
          "DashedIdent",
          "Token",
          "Token",
          "Token",
          "Token",
          "Token",
          "Token",
          "Token",
          "Token",
        ],
        "depth": 0,
        "next": undefined,
        "nextSibling": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 0,
            "line": 1,
          },
          "start": {
            "column": 1,
            "line": 0,
            "source_index": 0,
          },
        },
        "prev": undefined,
        "prevSibling": undefined,
        "text": "@custom-media --modern (color), (hover);
    ",
        "type": "Rule",
      },
      {
        "children": [
          "Selector",
          "Declaration",
          "Declaration",
          "Declaration",
          "Declaration",
          "Declaration",
          "Declaration",
          "Declaration",
          "Rule",
        ],
        "depth": 0,
        "next": "Token",
        "nextSibling": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 0,
            "line": 17,
          },
          "start": {
            "column": 1,
            "line": 2,
            "source_index": 0,
          },
        },
        "prev": "Token",
        "prevSibling": "Rule",
        "text": ".foo {
      background: yellow;

      -webkit-border-radius: 2px;
      -moz-border-radius: 2px;
      border-radius: 2px;

      -webkit-transition: background 200ms;
      -moz-transition: background 200ms;
      transition: background 200ms;

      &.bar {
        color: green;
      }
    }
    ",
        "type": "Rule",
      },
      {
        "children": [
          "MediaQuery",
          "Rule",
        ],
        "depth": 0,
        "next": "Color",
        "nextSibling": undefined,
        "parent": undefined,
        "pos": {
          "end": {
            "column": 1,
            "line": 22,
          },
          "start": {
            "column": 1,
            "line": 18,
            "source_index": 0,
          },
        },
        "prev": "Color",
        "prevSibling": "Rule",
        "text": "@media (--modern) and (width > 1024px) {
      .a {
        color: green;
      }
    ",
        "type": "Rule",
      },
    ]
  `)
})

test('lightningTransform - playground sample', async () => {
  const code = `@media (min-width: 990px) {
  .bg {
    background-color: red;
  }
}

.bg {
  background-color: green;
}

@media (max-width: 1290px) {
  .bg {
    background-color: blue;
  }
}

@media (min-width: 640px) {
  .bg {
    background-color: yellow;
  }
}`

  const result = lightningTransform(code)
  expect(
    Array.from(result.nodes).map((n) =>
      Object.assign(pick(n, ['type', 'pos', 'depth', 'text']), {
        prev: n.prev?.type,
        next: n.next?.type,
        prevSibling: n.prevSibling?.type,
        nextSibling: n.nextSibling?.type,
        parent: n.parent?.type,
        children: n.children.map((c) => c.type),
      }),
    ),
  ).toMatchInlineSnapshot(`
    [
      {
        "children": [
          "MediaQuery",
          "Rule",
        ],
        "depth": 0,
        "next": "MediaQuery",
        "nextSibling": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 0,
            "line": 5,
          },
          "start": {
            "column": 1,
            "line": 0,
            "source_index": 0,
          },
        },
        "prev": undefined,
        "prevSibling": undefined,
        "text": "@media (min-width: 990px) {
      .bg {
        background-color: red;
      }
    }
    ",
        "type": "Rule",
      },
      {
        "children": [
          "Selector",
          "Declaration",
        ],
        "depth": 0,
        "next": "Selector",
        "nextSibling": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 0,
            "line": 9,
          },
          "start": {
            "column": 1,
            "line": 6,
            "source_index": 0,
          },
        },
        "prev": "Color",
        "prevSibling": "Rule",
        "text": ".bg {
      background-color: green;
    }
    ",
        "type": "Rule",
      },
      {
        "children": [
          "MediaQuery",
          "Rule",
        ],
        "depth": 0,
        "next": "MediaQuery",
        "nextSibling": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 0,
            "line": 15,
          },
          "start": {
            "column": 1,
            "line": 10,
            "source_index": 0,
          },
        },
        "prev": "Color",
        "prevSibling": "Rule",
        "text": "@media (max-width: 1290px) {
      .bg {
        background-color: blue;
      }
    }
    ",
        "type": "Rule",
      },
      {
        "children": [
          "MediaQuery",
          "Rule",
        ],
        "depth": 0,
        "next": "MediaQuery",
        "nextSibling": undefined,
        "parent": undefined,
        "pos": {
          "end": {
            "column": 1,
            "line": 20,
          },
          "start": {
            "column": 1,
            "line": 16,
            "source_index": 0,
          },
        },
        "prev": "Color",
        "prevSibling": "Rule",
        "text": "@media (min-width: 640px) {
      .bg {
        background-color: yellow;
      }
    ",
        "type": "Rule",
      },
    ]
  `)
})
