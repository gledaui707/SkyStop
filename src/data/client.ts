import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/** Browser client: public URL + publishable key only. Never a service-role key. */
export function getSupabase(url = import.meta.env?.VITE_SUPABASE_URL, key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY): SupabaseClient {
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
