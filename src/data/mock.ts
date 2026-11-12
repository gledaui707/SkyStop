// Guest UI flags. The catalogue (airports, activities, itineraries)
// and saved plans are NOT mocked: they come from Supabase via ./catalogue and ./plans.
export { AIRPORTS, ACTIVITIES, TEMPLATES, GRAPHS, isSupported, getAirport, getActivities, getTemplates } from './catalogue'


// v2: the three-screen onboarding (Nov 2026). A new key so every browser sees it once.
const WELCOMED = 'skystop.onboarded.v2'
/** Welcome-screen flag only (UI preference). Guest identity itself is a Supabase anonymous session. */
export const guestStore = {
  hasWelcomed(): boolean { try { return localStorage.getItem(WELCOMED) === '1' } catch { return false } },
  markWelcomed() { try { localStorage.setItem(WELCOMED, '1') } catch { /* ignore */ } },
  reset() { try { localStorage.removeItem(WELCOMED) } catch { /* ignore */ } },
}

