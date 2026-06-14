const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const hash = await bcrypt.hash('ClaudeTest123!', 10);
  const { error } = await sb.from('users').insert({ name: 'Claude Test', email: 'claude-login-test3@example.com', password: hash });
  console.log(error ? 'ERR '+JSON.stringify(error) : 'user ready');
})();
