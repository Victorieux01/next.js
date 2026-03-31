import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Record<string, { Row: any; Insert: any; Update: any }>;

declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: SupabaseClient | undefined;
}

const supabase: SupabaseClient =
  global._supabaseAdmin ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (createClient as any)(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

if (process.env.NODE_ENV !== 'production') {
  global._supabaseAdmin = supabase;
}

export default supabase;
// Re-export typed helper so callers can opt-in without changing imports
export type { AnyDatabase };
