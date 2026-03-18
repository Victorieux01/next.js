import { NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('invoiceId');
  const action = searchParams.get('action');

  if (!invoiceId || !action) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    if (action === 'accept') {
      // Delete the invoice
      await sql`DELETE FROM invoices WHERE id = ${invoiceId}`;
      return new Response(
        `<html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #22c55e;">✅ Invoice Deleted</h2>
            <p>The invoice has been successfully deleted.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // Remove pending status
      await sql`
        UPDATE invoices 
        SET status = 'pending' 
        WHERE id = ${invoiceId} AND status = 'pending_deletion'
      `;
      return new Response(
        `<html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #ef4444;">❌ Deletion Declined</h2>
            <p>The invoice deletion has been declined and the invoice remains active.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}