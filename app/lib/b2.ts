import { S3Client } from '@aws-sdk/client-s3';

// Backblaze B2 — S3-compatible API.
// Buckets: B2_BUCKET_ORIGINALS (editor uploads), B2_BUCKET_PREVIEWS (FFmpeg output).
// Endpoint format: https://s3.<region>.backblazeb2.com

function createB2Client() {
  const keyId    = process.env.B2_KEY_ID;
  const appKey   = process.env.B2_APP_KEY;
  const endpoint = process.env.B2_ENDPOINT; // e.g. https://s3.us-west-004.backblazeb2.com

  if (!keyId || !appKey || !endpoint) {
    throw new Error('B2 not configured — set B2_KEY_ID, B2_APP_KEY, B2_ENDPOINT');
  }

  return new S3Client({
    endpoint,
    region: 'us-east-1', // B2 ignores this but SDK requires it
    credentials: { accessKeyId: keyId, secretAccessKey: appKey },
    forcePathStyle: true,
  });
}

export const b2 = createB2Client;

export const B2_BUCKET_ORIGINALS = () => process.env.B2_BUCKET_ORIGINALS ?? 'coredon-originals';
export const B2_BUCKET_PREVIEWS  = () => process.env.B2_BUCKET_PREVIEWS  ?? 'coredon-previews';
