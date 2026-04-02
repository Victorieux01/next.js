import { generateSecret, generate, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';

export { generateSecret };

export function generateTotpUri(email: string, secret: string): string {
  const issuer = process.env.TOTP_ISSUER ?? 'Coredon';
  return generateURI({ issuer, label: email, secret });
}

export async function generateQrCodeDataUrl(otpUri: string): Promise<string> {
  return QRCode.toDataURL(otpUri, { width: 200, margin: 2 });
}

export async function verifyTotpCode(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

export async function generateTotpToken(secret: string): Promise<string> {
  return generate({ secret });
}
