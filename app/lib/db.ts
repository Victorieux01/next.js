import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var _pgSql: ReturnType<typeof postgres> | undefined;
}

const rawUrl = process.env.POSTGRES_URL!.replace(/^["']|["']$/g, '');

const sql = global._pgSql ?? postgres(rawUrl, {
  ssl: 'require',
  prepare: false,   // required for Supabase pgBouncer (transaction mode)
  max: 1,           // pooler handles pooling; one connection per server instance is enough
});

if (process.env.NODE_ENV !== 'production') {
  global._pgSql = sql;
}

export default sql;
