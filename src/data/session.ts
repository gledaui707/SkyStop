import type { SupabaseClient } from '@supabase/supabase-js';

let pending: Promise<string> | undefined;

/** Existing session first; signInAnonymously only if absent. Concurrent calls share one sign-in (one identity). */
export function ensureGuestSession(sb: SupabaseClient): Promise<string> {
  pending ??= (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: s, error } = await sb.auth.signInAnonymously();
    if (error || !s.user) throw new Error(`Guest sign-in failed: ${error?.message ?? 'no user'}`);
    return s.user.id;
  })().finally(() => { pending = undefined; });
  return pending;
}
