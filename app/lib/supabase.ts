import { createClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: ReturnType<typeof createClient> | undefined;
}

const supabase =
  global._supabaseAdmin ??
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

if (process.env.NODE_ENV !== 'production') {
  global._supabaseAdmin = supabase;
}

export default supabase;
