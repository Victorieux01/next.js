export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const postgres = (await import('postgres')).default;
      const rawUrl = (process.env.POSTGRES_URL ?? '').replace(/^["']|["']$/g, '');
      if (!rawUrl) return;
      const sql = postgres(rawUrl, { ssl: 'require', max: 1, idle_timeout: 5 });
      await sql`
        CREATE TABLE IF NOT EXISTS coredon_project_messages (
          id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id  UUID        NOT NULL,
          sender      TEXT        NOT NULL,
          sender_name TEXT        NOT NULL,
          content     TEXT        NOT NULL,
          created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_coredon_msg_pid
        ON coredon_project_messages (project_id, created_at)
      `;
      await sql`SELECT pg_notify('pgrst', 'reload schema')`;
      await sql.end();
    } catch {
      // Non-fatal — table may already exist or DB unavailable at startup
    }
  }
}
