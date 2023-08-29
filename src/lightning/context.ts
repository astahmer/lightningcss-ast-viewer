import { createContextWithHook } from 'pastable/react'
import { ActorRefFrom } from 'xstate'
import { playgroundMachine } from './playground-machine'

export const [LightningContextProvider, useLightningContext] = createContextWithHook<
  ActorRefFrom<typeof playgroundMachine>
>({
  name: 'LightningContext',
})
