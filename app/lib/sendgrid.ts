import { Resend } from 'resend';
import { generatePortalToken } from './portal-token';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const resend = new Proxy({} as Resend, {
  get(_, prop) { return Reflect.get(getResend(), prop as string); },
});

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  assignmentType,
  referenceLinks,
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
  assignmentType?: 'complete' | 'limited' | '';
  referenceLinks?: string;
}) {
  const portalUrl = `${appUrl}/client/${projectId}?token=${generatePortalToken(projectId)}`;
  const fmtAmount = amount.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + ' $';

  const assignmentLabel = assignmentType === 'complete' ? 'Complete Assignment' : assignmentType === 'limited' ? 'Limited License' : '';
  const assignmentClause = assignmentType === 'complete'
    ? `${esc(editorName)} transfers to the client all economic rights over the delivered work, exclusively, worldwide, and in perpetuity, upon full release of the escrow payment. The editor retains their inalienable moral right and the right to present the work in their personal portfolio.`
    : assignmentType === 'limited'
    ? `${esc(editorName)} grants the client a license to use the work according to the terms defined in the editor&#39;s contract attached to this transaction. In the absence of explicitly defined license terms, this assignment is automatically considered a complete assignment.`
    : '';

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
      <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto">
        <tr><td>
          <p style="font-size:22px;font-weight:700;color:#fff;letter-spacing:0.18em;text-transform:uppercase;text-align:center;margin:0 0 32px">COREDON</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#161616;border:1px solid rgba(255,255,255,0.09);border-radius:16px;overflow:hidden">
            <tr><td style="padding:32px">
              <p style="margin:0 0 6px;font-size:12px;color:#555;letter-spacing:0.08em;text-transform:uppercase">New Project Contract</p>
              <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em">${esc(projectName)}</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px"/>
              <p style="margin:0 0 20px;font-size:14px;color:#888;line-height:1.6">
                Hi ${esc(clientName)},<br/><br/>
                <strong style="color:#aaa">${esc(editorName)}</strong> has created a new project contract for you on Coredon.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px">
                ${description ? `<tr><td style="padding:0 0 14px"><p style="margin:0;font-size:11px;color:#555;letter-spacing:0.06em;text-transform:uppercase">Scope of Work</p><p style="margin:4px 0 0;font-size:14px;color:#ccc;line-height:1.6;white-space:pre-wrap">${esc(description)}</p></td></tr>` : ''}
                ${referenceLinks ? `<tr><td style="padding:0 0 14px;border-top:1px solid rgba(255,255,255,0.06)"><p style="margin:0;font-size:11px;color:#555;letter-spacing:0.06em;text-transform:uppercase;padding-top:14px">Visual References</p><p style="margin:4px 0 0;font-size:13px;color:#aaa;line-height:1.6;white-space:pre-wrap">${esc(referenceLinks)}</p></td></tr>` : ''}
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

              ${assignmentClause ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px;background:#111;border:1px solid rgba(99,102,241,0.3);border-left:3px solid #6366F1;border-radius:0 8px 8px 0">
                <tr><td style="padding:14px 18px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6366F1;letter-spacing:0.08em;text-transform:uppercase">Rights Assignment &#8212; ${assignmentLabel}</p>
                  <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6">${assignmentClause}</p>
                </td></tr>
              </table>` : ''}

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 16px;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:8px">
                <tr><td style="padding:16px 18px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:0.08em;text-transform:uppercase">Contractual Protections</p>
                  <p style="margin:0 0 8px;font-size:12px;color:#888;line-height:1.6"><strong style="color:#aaa">Creator Recognition:</strong> The client recognizes ${esc(editorName)} as the original creator and agrees never to claim authorship to third parties, institutions, festivals, or any public or private platform.</p>
                  <p style="margin:0 0 8px;font-size:12px;color:#888;line-height:1.6"><strong style="color:#aaa">Portfolio Rights:</strong> ${esc(editorName)} retains the irrevocable right to present this work in their portfolio and professional materials, regardless of assignment type, after full payment release.</p>
                  <p style="margin:0 0 8px;font-size:12px;color:#888;line-height:1.6"><strong style="color:#aaa">Credit:</strong> The client agrees to credit ${esc(editorName)} as editor in all public distribution or presentation contexts, unless otherwise agreed in writing.</p>
                  <p style="margin:0;font-size:12px;color:#888;line-height:1.6"><strong style="color:#aaa">Document Hierarchy:</strong> This Coredon Brief is the primary reference for any dispute. Any supplementary editor contract is valid for clauses not covered here. In case of contradiction, this Brief prevails.</p>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px">
                <tr><td style="padding:14px 18px">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#EF4444;letter-spacing:0.08em;text-transform:uppercase">Legal Notices &#8212; Please Read</p>
                  <p style="margin:0 0 7px;font-size:12px;color:#aaa;line-height:1.6"><strong style="color:#ccc">Forensic Watermark:</strong> Every file viewed on Coredon contains a unique invisible digital identifier linked to your account, session, and personal information. This identifier survives compression, re-encoding, and screen recording.</p>
                  <p style="margin:0 0 7px;font-size:12px;color:#aaa;line-height:1.6"><strong style="color:#ccc">Viewing Logs:</strong> Coredon records your complete viewing session including precise timestamps, segments watched, your IP address, and device information.</p>
                  <p style="margin:0 0 7px;font-size:12px;color:#aaa;line-height:1.6"><strong style="color:#ccc">Mandatory Arbitration:</strong> Any dispute must be submitted to Coredon&#39;s resolution mechanism before any external recourse. The decision, based on available evidence (viewing logs, forensic watermark, signed brief, communications), is final and binding for both parties.</p>
                  <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6"><strong style="color:#ccc">Chargeback:</strong> Initiating a chargeback without first submitting to Coredon arbitration constitutes a violation of these terms and results in immediate account suspension, escrow fund retention, and transmission of all evidence to the editor.</p>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:0.08em;text-transform:uppercase">Your project portal lets you</p>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;View contract details &amp; timeline</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;Fund the escrow securely via Stripe</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;Chat directly with your provider</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;View &amp; approve delivered files</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;Approve deliverables to release funds</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <a href="${portalUrl}" style="display:block;background:#6366F1;color:#fff;border-radius:10px;padding:18px;font-size:16px;font-weight:800;text-decoration:none;text-align:center;letter-spacing:0.02em">Open My Project Portal &#8594;</a>
              <p style="margin:14px 0 0;font-size:12px;color:#444;text-align:center;line-height:1.5">
                By accessing your portal and funding the escrow, you acknowledge and accept all terms above. This link is private to you.
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
                <strong style="color:#aaa">Note:</strong> <span style="color:#666">This preview is forensically watermarked and protected. The final delivery will be clean.</span>
              </p>
              <a href="${previewUrl}" style="display:block;background:#1a8cff;color:#fff;border-radius:10px;padding:16px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;letter-spacing:0.02em">View Preview &#8594;</a>
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

export async function sendApprovalEmail({
  providerEmail,
  providerName,
  projectName,
  amount,
  projectId,
  appUrl,
}: {
  providerEmail: string;
  providerName: string;
  projectName: string;
  amount: number;
  projectId: string;
  appUrl: string;
}) {
  const fmtAmount = amount.toLocaleString('fr-CA', { maximumFractionDigits: 0 }) + ' $';
  const dashboardUrl = `${appUrl}/dashboard/projects/${projectId}`;

  await resend.emails.send({
    from: 'Coredon <contracts@coredon.app>',
    to: providerEmail,
    subject: `Client Approved — ${projectName}`,
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
              <p style="margin:0 0 6px;font-size:12px;color:#00C896;letter-spacing:0.08em;text-transform:uppercase">Project Approved</p>
              <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em">${projectName}</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px"/>
              <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6">
                Hi ${providerName},<br/><br/>
                Great news &#8212; your client has <strong style="color:#00C896">approved the deliverables</strong> and released the funds for <strong style="color:#aaa">${projectName}</strong>.<br/><br/>
                Amount released: <strong style="color:#00C896">${fmtAmount}</strong>
              </p>
              <a href="${dashboardUrl}" style="display:block;background:#00C896;color:#000;border-radius:10px;padding:16px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;letter-spacing:0.02em">View Project &#8594;</a>
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

export async function sendRequestChangesEmail({
  providerEmail,
  providerName,
  projectName,
  clientName,
  reason,
  projectId,
  appUrl,
}: {
  providerEmail: string;
  providerName: string;
  projectName: string;
  clientName: string;
  reason: string;
  projectId: string;
  appUrl: string;
}) {
  const dashboardUrl = `${appUrl}/dashboard/projects/${projectId}`;

  await resend.emails.send({
    from: 'Coredon <contracts@coredon.app>',
    to: providerEmail,
    subject: `Changes Requested — ${projectName}`,
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
              <p style="margin:0 0 6px;font-size:12px;color:#F59E0B;letter-spacing:0.08em;text-transform:uppercase">Changes Requested</p>
              <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em">${projectName}</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px"/>
              <p style="margin:0 0 16px;font-size:14px;color:#888;line-height:1.6">
                Hi ${providerName},<br/><br/>
                <strong style="color:#aaa">${clientName}</strong> has reviewed the latest deliverable for <strong style="color:#aaa">${projectName}</strong> and is requesting changes.
              </p>
              <div style="background:#1e1e1e;border:1px solid rgba(255,255,255,0.08);border-left:4px solid #F59E0B;border-radius:8px;padding:16px;margin-bottom:24px">
                <p style="margin:0 0 6px;font-size:11px;color:#F59E0B;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Client Feedback</p>
                <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6;white-space:pre-wrap">${reason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </div>
              <a href="${dashboardUrl}" style="display:block;background:#1a8cff;color:#fff;border-radius:10px;padding:16px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;letter-spacing:0.02em">View Project &#8594;</a>
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

export async function sendPortalAccessEmail({
  clientEmail,
  clientName,
  providerName,
  projectName,
  projectId,
  appUrl,
}: {
  clientEmail: string;
  clientName: string;
  providerName: string;
  projectName: string;
  projectId: string;
  appUrl: string;
}) {
  const portalUrl = `${appUrl}/client/${projectId}?token=${generatePortalToken(projectId)}`;

  await resend.emails.send({
    from: 'Coredon <contracts@coredon.app>',
    to: clientEmail,
    subject: `Your Project Portal — ${projectName}`,
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
              <p style="margin:0 0 6px;font-size:12px;color:#555;letter-spacing:0.08em;text-transform:uppercase">Project Portal Access</p>
              <p style="margin:0 0 20px;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em">${projectName}</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px"/>
              <p style="margin:0 0 20px;font-size:14px;color:#888;line-height:1.6">
                Hi ${clientName},<br/><br/>
                <strong style="color:#aaa">${providerName}</strong> has shared your project portal for <strong style="color:#aaa">${projectName}</strong>. Use the link below to access your portal at any time.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:0.08em;text-transform:uppercase">Your portal lets you</p>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;View contract details &amp; timeline</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;Fund the escrow securely via Stripe</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;Chat directly with your provider</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;View &amp; approve delivered files</td></tr>
                      <tr><td style="padding:3px 0;font-size:13px;color:#999">&#10003;&nbsp;&nbsp;Approve deliverables to release funds</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <a href="${portalUrl}" style="display:block;background:#6366F1;color:#fff;border-radius:10px;padding:18px;font-size:16px;font-weight:800;text-decoration:none;text-align:center;letter-spacing:0.02em">Open My Project Portal &#8594;</a>
              <p style="margin:14px 0 0;font-size:12px;color:#444;text-align:center;line-height:1.5">
                This link is private to you and always shows the latest project status.
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
