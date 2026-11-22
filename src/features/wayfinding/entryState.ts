// UI state that belongs to one entry of the screen stack (e.g. the Explore map's filters, search, focused venue and
// camera). Kept per route object, so returning to that entry (the app's Back or the browser's) restores it exactly,
// while a new visit starts fresh. Planning state (the itinerary) lives in the store, never here.
import { useCallback, useState } from 'react'

const mem = new WeakMap<object, unknown>()

export function useEntryState<T extends object>(entry: object, init: () => T): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(() => (mem.get(entry) as T | undefined) ?? init())
  const patch = useCallback((p: Partial<T>) => setState((s) => { const n = { ...s, ...p }; mem.set(entry, n); return n }), [entry])
  return [state, patch]
}

/** Another entry's saved state (e.g. whether the screen under this one was showing its list or its map). */
export const peekEntryState = <T,>(entry: object | null | undefined): T | undefined => (entry ? (mem.get(entry) as T | undefined) : undefined)
