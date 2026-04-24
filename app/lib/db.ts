import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var _pgSql: ReturnType<typeof postgres> | undefined;
}

export function getSql(): ReturnType<typeof postgres> {
  if (global._pgSql) return global._pgSql;
  const rawUrl = (process.env.POSTGRES_URL ?? '').replace(/^["']|["']$/g, '');
  const sql = postgres(rawUrl, {
    ssl: 'require',
    prepare: false,
    max: 1,
  });
  if (process.env.NODE_ENV !== 'production') {
    global._pgSql = sql;
  }
  return sql;
}
