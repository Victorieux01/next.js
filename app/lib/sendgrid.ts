import { Resend } from 'resend';

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
  const portalUrl = `${appUrl}/client/${projectId}`;
  const fmtAmount = amount.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + '\u00a0$';

  await resend.emails.send({
    from: 'Coredon <contracts@coredon.app>',
    to: clientEmail,
    subject: `New Contract — ${projectName}`,
    html: `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/></head>
<body style="background-color:#0a0a0a;margin:0;padding:0;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tr><td style="padding:48px 20px">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;margin:0 auto">
        <tr><td>
          <p style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.18em;text-transform:uppercase;text-align:center;margin:0 0 32px">COREDON</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#161616;border:1px solid rgba(255,255,255,0.09);border-radius:16px;overflow:hidden">
            <tr><td style="padding:32px">
              <p style="margin:0 0 6px;font-size:12px;color:#555;letter-spacing:0.08em;text-transform:uppercase">New Project Contract</p>
              <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em">${projectName}</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px"/>
              <p style="margin:0 0 20px;font-size:14px;color:#888;line-height:1.6">
                Hi ${clientName},<br/><br/>
                <strong style="color:#aaa">${editorName}</strong> has created a new project contract for you on Coredon.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px">
                ${description ? `<tr><td style="padding:0 0 12px"><p style="margin:0;font-size:11px;color:#555;letter-spacing:0.06em;text-transform:uppercase">Description</p><p style="margin:4px 0 0;font-size:14px;color:#ccc;line-height:1.5">${description.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></td></tr>` : ''}
                <tr>
                  <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.06)">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="width:33%"><p style="margin:0;font-size:11px;color:#555;letter-spacing:0.06em;text-transform:uppercase">Amount</p><p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#00C896">${fmtAmount}</p></td>
                        ${startDate ? `<td style="width:33%"><p style="margin:0;font-size:11px;color:#555;letter-spacing:0.06em;text-transform:uppercase">Start Date</p><p style="margin:4px 0 0;font-size:14px;color:#ccc">${startDate}</p></td>` : ''}
                        ${deadline ? `<td style="width:33%"><p style="margin:0;font-size:11px;color:#555;letter-spacing:0.06em;text-transform:uppercase">Deadline</p><p style="margin:4px 0 0;font-size:14px;color:#ccc">${deadline}</p></td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <a href="${portalUrl}" style="display:block;background:#1a8cff;color:#fff;border-radius:10px;padding:16px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;letter-spacing:0.02em">View Your Project Portal →</a>
              <p style="margin:16px 0 0;font-size:12px;color:#444;text-align:center;line-height:1.5">
                This link always shows the latest status of your project.
              </p>
            </td></tr>
          </table>
          <p style="text-align:center;font-size:11px;color:#363636;margin-top:20px">Powered by <span style="color:#555;font-weight:600">Coredon</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendPreviewEmail({
  clientEmail,
  clientName,
  projectName,
  previewUrl,
}: {
  clientEmail: string;
  clientName: string;
  projectName: string;
  previewUrl: string;
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: clientEmail,
    subject: `Your project preview is ready — ${projectName}`,
    html: `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/></head>
<body style="background-color:#0a0a0a;margin:0;padding:0;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tr><td style="padding:48px 20px">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;margin:0 auto">
        <tr><td>
          <p style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.18em;text-transform:uppercase;text-align:center;margin:0 0 32px">COREDON</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#161616;border:1px solid rgba(255,255,255,0.09);border-radius:16px;overflow:hidden">
            <tr><td style="padding:32px">
              <p style="margin:0 0 6px;font-size:12px;color:#555;letter-spacing:0.08em;text-transform:uppercase">Project Preview Ready</p>
              <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em">${projectName}</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px"/>
              <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6">
                Hi ${clientName},<br/><br/>
                Your provider has uploaded a new version of your project. Click below to preview it.<br/><br/>
                <strong style="color:#aaa">Note:</strong> <span style="color:#666">This preview is watermarked. The final delivery will be clean.</span>
              </p>
              <a href="${previewUrl}" style="display:block;background:#1a8cff;color:#fff;border-radius:10px;padding:16px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;letter-spacing:0.02em">View Preview →</a>
            </td></tr>
          </table>
          <p style="text-align:center;font-size:11px;color:#363636;margin-top:20px">Powered by <span style="color:#555;font-weight:600">Coredon</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
