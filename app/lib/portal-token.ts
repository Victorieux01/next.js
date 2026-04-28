import { createHmac, timingSafeEqual } from 'crypto';

export function generatePortalToken(projectId: string): string {
  return createHmac('sha256', process.env.AUTH_SECRET!)
    .update(projectId)
    .digest('hex');
}

export function verifyPortalToken(projectId: string, token: string): boolean {
  const expected = generatePortalToken(projectId);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
