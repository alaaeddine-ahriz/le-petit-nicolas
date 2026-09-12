import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * The only Supabase client that can actually read or write: RLS is on for every
 * table with no policies, so the publishable key is inert. Service-role key has
 * no NEXT_PUBLIC_ prefix, so Next.js never ships it to the browser — importing
 * this from a client component yields an undefined key, not a leak.
 */
export function db(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
