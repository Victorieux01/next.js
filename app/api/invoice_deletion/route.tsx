import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';

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
      await supabase.from('invoices').delete().eq('id', invoiceId);
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
      await supabase
        .from('invoices')
        .update({ status: 'pending' })
        .eq('id', invoiceId)
        .eq('status', 'pending_deletion');
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