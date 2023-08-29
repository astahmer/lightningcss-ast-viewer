import { expect, test } from 'vitest'

import { lightningTransform } from '../lightning/light-transform'
import { pick } from 'pastable'

test('lightningTransform - lightningcss.dev sample', async () => {
  const code = `@custom-media --modern (color), (hover);

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
        next: n.next?.type,
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
        "next": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 3,
            "line": 2,
          },
          "start": {
            "column": 1,
            "line": 0,
            "source_index": 0,
          },
        },
        "prev": undefined,
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
        "next": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 3,
            "line": 18,
          },
          "start": {
            "column": 5,
            "line": 2,
            "source_index": 0,
          },
        },
        "prev": "Rule",
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
        "next": undefined,
        "parent": undefined,
        "pos": {
          "end": {
            "column": 5,
            "line": 22,
          },
          "start": {
            "column": 5,
            "line": 18,
            "source_index": 0,
          },
        },
        "prev": "Rule",
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
  }
  `

  const result = lightningTransform(code)
  expect(
    Array.from(result.nodes).map((n) =>
      Object.assign(pick(n, ['type', 'pos', 'depth', 'text']), {
        prev: n.prev?.type,
        next: n.next?.type,
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
        "next": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 1,
            "line": 6,
          },
          "start": {
            "column": 1,
            "line": 0,
            "source_index": 0,
          },
        },
        "prev": undefined,
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
        "next": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 1,
            "line": 10,
          },
          "start": {
            "column": 3,
            "line": 6,
            "source_index": 0,
          },
        },
        "prev": "Rule",
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
        "next": "Rule",
        "parent": undefined,
        "pos": {
          "end": {
            "column": 1,
            "line": 16,
          },
          "start": {
            "column": 3,
            "line": 10,
            "source_index": 0,
          },
        },
        "prev": "Rule",
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
        "next": undefined,
        "parent": undefined,
        "pos": {
          "end": {
            "column": 2,
            "line": 21,
          },
          "start": {
            "column": 3,
            "line": 16,
            "source_index": 0,
          },
        },
        "prev": "Rule",
        "text": "@media (min-width: 640px) {
        .bg {
          background-color: yellow;
        }
      }
     ",
        "type": "Rule",
      },
    ]
  `)
})
