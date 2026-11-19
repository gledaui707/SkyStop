// Activity interests chosen in the onboarding conversation (Dining, Shopping, Relaxation, Attractions). They only
// order airport discovery (matching categories first); they never add activities to a plan or use up time.
// Kept in this browser (no schema change); an empty list means no preference.
import type { Category } from './types'

const KEY = 'skystop.interests.v1'
const ALLOWED: Category[] = ['Food', 'Shopping', 'Rest', 'Sights']

export const interestsStore = {
  get(): Category[] {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((c): c is Category => ALLOWED.includes(c)) : [] } catch { return [] }
  },
  set(list: Category[]) { try { localStorage.setItem(KEY, JSON.stringify(list.filter((c) => ALLOWED.includes(c)))) } catch { /* optional */ } },
}

/** Activities with the visitor's interests first (stable: the catalogue order is kept within each group). */
export function byInterest<T extends { category: Category }>(list: T[], interests: Category[] = interestsStore.get()): T[] {
  if (!interests.length) return list
  return [...list].sort((a, b) => Number(!interests.includes(a.category)) - Number(!interests.includes(b.category)))
}
