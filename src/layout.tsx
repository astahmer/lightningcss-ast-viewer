import { Flex, Stack, styled, HStack } from '../styled-system/jsx'
import { ColorModeSwitch } from './components/color-mode-switch'
import { IconButton } from './components/icon-button'
import { ThemeProvider } from './vite-themes/provider'
import { GithubIcon } from './components/github-icon'

import type { PropsWithChildren } from 'react'

import '@fontsource/inter' // Defaults to weight 400
import '@fontsource/inter/700.css' // Defaults to weight 400
import { Switch } from './components/ui/switch'
import { useSetAtom } from 'jotai'
import { withDetailsAtom } from './lightning/atoms'

export const Layout = ({ children }: PropsWithChildren) => {
  return (
    <ThemeProvider>
      <Flex w="100%" height="100vh" bg={{ base: 'whiteAlpha.100', _dark: 'whiteAlpha.200' }} fontFamily="Inter" p="3">
        <Stack w="100%" h="100%" colorPalette="yellow">
          <Flex pt="2" color={{ base: 'colorPalette.400', _dark: 'colorPalette.200' }}>
            <styled.h1 textStyle="panda.h4" fontWeight="bold">
              Lightning CSS AST Viewer
            </styled.h1>
            <HStack alignItems="center" ml="auto">
              <ToggleWithDetails />
              <styled.a target="blank" href="https://github.com/astahmer/lightningcss-ast-viewver">
                <IconButton title="Github" css={{ color: { base: 'colorPalette.500', _dark: 'colorPalette.200' } }}>
                  <GithubIcon />
                </IconButton>
              </styled.a>
              <styled.a target="blank" href="https://lightningcss.dev/">
                <IconButton
                  title="LightningCSS"
                  css={{ color: { base: 'colorPalette.500', _dark: 'colorPalette.200' } }}
                >
                  ⚡
                </IconButton>
              </styled.a>
              <ColorModeSwitch />
            </HStack>
          </Flex>
          {children}
        </Stack>
      </Flex>
    </ThemeProvider>
  )
}

const ToggleWithDetails = () => {
  const setWithDetails = useSetAtom(withDetailsAtom)

  return (
    <Flex alignItems="center" gap="2">
      <Switch id="toggle-details" color="red" onClick={() => setWithDetails((c) => !c)} />
      <label htmlFor="toggle-details">Toggle details</label>
    </Flex>
  )
}
