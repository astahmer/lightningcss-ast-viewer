import { defineSemanticTokens } from '@pandacss/dev'
import { defineTokens } from '@pandacss/dev'

export const tokens = defineTokens({
  colors: {
    whiteish: { value: 'rgba(255, 255, 255, 0.87)' },
    blackish: { value: '#242424' },
  },
  spacing: {
    0.25: { value: '0.065rem' },
  },
})

export const semanticTokens = defineSemanticTokens({
  colors: {
    'text.main': {
      value: { base: '{colors.yellow.300}', _dark: '{colors.blackish}' },
    },
    'bg.main': {
      value: { base: '{colors.blackish}', _dark: '{colors.whiteish}' },
    },
  },
})
