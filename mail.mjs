import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * @param {{ clientEmail: string, clientName: string, editorName: string, projectName: string }} params
 */
export async function sendContractEmail({ clientEmail, clientName, editorName, projectName }) {
  await resend.emails.send({
    from: 'Coredon <contracts@coredon.app>',
    to: clientEmail,
    subject: `New Contract — ${projectName}`,
    template: {
      id: 'contract-signature',
      variables: {
        client_name: clientName,
        ve_name: editorName,
      },
    },
  });
}
