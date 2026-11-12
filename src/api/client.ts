import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public browser configuration (safe to ship): project URL + publishable key. Never a service-role key.
// Deliberately NOT overridable by Vercel environment variables: stale VITE_SUPABASE_* values left over from the old
// project would silently point the live app at a dead database. Change these two constants to switch projects.
const DEFAULT_URL = 'https://sgwbtgwccskqamzttczz.supabase.co';
const DEFAULT_KEY = 'sb_publishable_9ChZ7Mk52ignva4mWoL6Yw_Bj4RL14D';
const REQUEST_TIMEOUT_MS = 15000;

let client: SupabaseClient | undefined;

/** A request that never answers becomes an error after 15 s instead of an endless spinner. */
const timedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

export function getSupabase(
  url: string = DEFAULT_URL,
  key: string = DEFAULT_KEY,
): SupabaseClient {
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true }, global: { fetch: timedFetch } });
  return client;
}
