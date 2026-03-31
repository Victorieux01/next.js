import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
