import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public browser configuration (safe to ship): project URL + publishable key. Never a service-role key.
// Env vars override these defaults, so Vercel needs no configuration for the demo project.
const DEFAULT_URL = 'https://rdrkskrzdyqezzopnena.supabase.co';
const DEFAULT_KEY = 'sb_publishable_fSu0PKPg6Y4T4JICz-Cczg_CEn5jP30';
const REQUEST_TIMEOUT_MS = 15000;

let client: SupabaseClient | undefined;

/** A request that never answers becomes an error after 15 s instead of an endless spinner. */
const timedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

export function getSupabase(
  url: string = import.meta.env?.VITE_SUPABASE_URL || DEFAULT_URL,
  key: string = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY,
): SupabaseClient {
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true }, global: { fetch: timedFetch } });
  return client;
}
