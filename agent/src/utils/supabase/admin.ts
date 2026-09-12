import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-side only. RLS is enabled on every table with no policies, so the
// publishable key reads nothing and writes nothing — this is the client that
// actually works. SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so
// Next.js never inlines it into a browser bundle: importing this from a client
// component gives you an undefined key, not a leak.
export const createAdminClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
