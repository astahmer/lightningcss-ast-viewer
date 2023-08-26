import { defineConfig } from '@pandacss/dev'
import { recipes } from './theme/recipes'
import { semanticTokens, tokens } from './theme/tokens'
import { textStyles } from './theme/text-styles'

export default defineConfig({
  // Whether to use css reset
  preflight: true,
  presets: ['@shadow-panda/preset', '@park-ui/presets'],

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  conditions: {
    // next-themes
    dark: '.dark &, [data-theme="dark"] &',
    light: '.light &',
  },

  // Useful for theme customization
  theme: {
    extend: { tokens, semanticTokens, textStyles, recipes },
  },
  globalCss: {
    'html, body': {
      color: 'text.main',
      backgroundColor: 'bg.main',
    },
  },
  staticCss: {
    recipes: {
      // Load toast variant styles since it cannot be statically analyzed
      toast: [{ variant: ['*'] }],
    },
  },

  // The output directory for your css system
  outdir: 'styled-system',

  // The JSX framework to use
  jsxFramework: 'react',
})
