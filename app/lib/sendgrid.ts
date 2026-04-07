import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContractEmail({
  clientEmail,
  clientName,
  editorName,
  projectName,
  description,
  amount,
  startDate,
  deadline,
  projectId,
  appUrl,
}: {
  clientEmail: string;
  clientName: string;
  editorName: string;
  projectName: string;
  description: string;
  amount: number;
  startDate: string;
  deadline: string;
  projectId: string;
  appUrl: string;
}) {
  const templatePath = path.join(process.cwd(), 'contract.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Calculate duration in days
  let duration = '—';
  if (startDate && deadline) {
    const ms = new Date(deadline).getTime() - new Date(startDate).getTime();
    const days = Math.round(ms / (1000 * 60 * 60 * 24));
    duration = days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '—';
  }

  const contractNumber = `CTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`;
  const fmtDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const fmtAmount = (n: number) =>
    n.toLocaleString('fr-CA', { minimumFractionDigits: 2 }) + ' $';

  const vars: Record<string, string> = {
    amount:           fmtAmount(amount),
    initiated_date:   fmtDate(new Date().toISOString().slice(0, 10)),
    contract_number:  contractNumber,
    project_id:       `PRJ-${projectId.slice(0, 8).toUpperCase()}`,
    deadline:         fmtDate(deadline),
    project_name:     projectName,
    client_name:      clientName,
    editor_name:      editorName,
    description:      description,
    duration:         duration,
    agreement_url:    `${appUrl}/dashboard/projects/${projectId}`,
    details_url:      `${appUrl}/dashboard/projects/${projectId}`,
    payment_url:      `${appUrl}/dashboard/projects/${projectId}`,
  };

  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value)
               .replaceAll(`{{ ${key} }}`, value)
               .replaceAll(`{{  ${key}  }}`, value);
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: clientEmail,
    subject: `New Contract — ${projectName}`,
    html,
  });
}

export async function sendDisputeRejectionEmail(
  clientEmail: string,
  projectName: string,
  reason: string,
) {
  await resend.emails.send({
    to: clientEmail,
    from: process.env.RESEND_FROM_EMAIL!,
    subject: `Dispute Rejected — ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Dispute Rejected</h2>
        <p>Hello,</p>
        <p>Your dispute for the project <strong>${projectName}</strong> has been reviewed and <strong>rejected</strong>.</p>
        <p><strong>Original dispute reason:</strong></p>
        <blockquote style="border-left: 4px solid #EF4444; padding: 12px 16px; background: #FEF2F2; color: #7F1D1D; border-radius: 4px; margin: 0 0 16px;">
          ${reason.replace(/\n/g, '<br/>')}
        </blockquote>
        <p>The funds have been released and the project will continue as previously agreed.</p>
        <p>If you have any questions, please reply to this email or contact us directly.</p>
        <p>Best regards,<br/>The Coredon Team</p>
      </div>
    `,
  });
}

export async function sendInvoiceDeletionEmail(
  customerEmail: string,
  customerName: string,
  amount: string,
  invoiceId: string,
) {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/invoice-deletion?invoiceId=${invoiceId}&action=accept`;
  const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/invoice-deletion?invoiceId=${invoiceId}&action=decline`;

  await resend.emails.send({
    to: customerEmail,
    from: process.env.RESEND_FROM_EMAIL!,
    subject: 'Invoice Deletion Request - Coredon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Invoice Deletion Request</h2>
        <p>Hi ${customerName},</p>
        <p>We are requesting to delete your invoice of <strong>${amount}</strong>.</p>
        <p>Please confirm whether you accept or decline this deletion:</p>
        <div style="margin: 30px 0;">
          <a href="${acceptUrl}"
             style="background-color: #ef4444; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; margin-right: 16px;">
            Accept Deletion
          </a>
          <a href="${declineUrl}"
             style="background-color: #22c55e; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px;">
            Decline Deletion
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          If you did not expect this email, please ignore it.
        </p>
        <p>Best regards,<br/>The Coredon Team</p>
      </div>
    `,
  });
}
