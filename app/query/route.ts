import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;
function getSql() {
  if (!_sql) {
    const rawUrl = (process.env.POSTGRES_URL ?? '').replace(/^["']|["']$/g, '');
    _sql = postgres(rawUrl, { ssl: 'require' });
  }
  return _sql;
}

async function listInvoices() {
const sql = getSql();
const data = await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;

	return data;
}

export async function GET() {

  try {
   	return Response.json(await listInvoices());
   } catch (error) {
   	return Response.json({ error }, { status: 500 });
   }
}
