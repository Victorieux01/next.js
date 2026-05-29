import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AnyDatabase = Record<string, { Row: any; Insert: any; Update: any }>;

declare global {
  var _supabaseAdmin: SupabaseClient | undefined;
}

function getSupabaseClient(): SupabaseClient {
  if (!global._supabaseAdmin) {
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
