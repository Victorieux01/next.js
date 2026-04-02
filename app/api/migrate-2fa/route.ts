import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
  try {
    await sql`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS totp_secret TEXT,
        ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `;
    return NextResponse.json({ success: true, message: '2FA columns added to users table.' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    await sql.end();
  }
}
