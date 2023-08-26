import { ark } from '@ark-ui/react'
import type { ComponentPropsWithoutRef } from 'react'
import { styled } from '../../../styled-system/jsx'
import { ButtonVariantProps, button } from '../../../styled-system/recipes'

export type ButtonProps = ButtonVariantProps & ComponentPropsWithoutRef<typeof ark.button>
export const Button = styled(ark.button, button)

ark.button.displayName = 'ArkButton'
Button.displayName = 'Button'
