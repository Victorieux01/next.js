import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Record<string, { Row: any; Insert: any; Update: any }>;

declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: SupabaseClient | undefined;
}

function getSupabaseClient(): SupabaseClient {
  if (!global._supabaseAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global._supabaseAdmin = (createClient as any)(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return global._supabaseAdmin!;
}

// Lazy proxy — defers createClient() until the first actual call at runtime.
// This prevents build failures when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// are not available in the build environment.
const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return Reflect.get(getSupabaseClient(), prop as string);
  },
});

export default supabase;
export type { AnyDatabase };
