import { atom } from 'jotai'

export const withDetailsAtom = atom(false)

export const actionTabs = [
  { id: 'output', label: 'Output' },
  { id: 'visitors', label: 'Visitors' },
] as const

export const activeActionTabAtom = atom<(typeof actionTabs)[number]['id']>(actionTabs[0].id)
