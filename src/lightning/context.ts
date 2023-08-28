import { createContextWithHook } from 'pastable/react'
import { LightningTransformResult, LightVisitors } from './types'

type LightningContext = {
  input: string
  output: LightningTransformResult
  setInput: (input: string) => void
  setOutput: (output: LightningTransformResult) => void
  visitors: LightVisitors
  setVisitors: (visitors: LightVisitors) => void
  update: (input: string) => void
}

export const [LightningContextProvider, useLightningContext] = createContextWithHook<LightningContext>({
  name: 'LightningContext',
})
