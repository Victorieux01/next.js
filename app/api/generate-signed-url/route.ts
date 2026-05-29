import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import supabase from '@/app/lib/supabase';
import { b2, B2_BUCKET_ORIGINALS, B2_BUCKET_PREVIEWS } from '@/app/lib/b2';

export const dynamic = 'force-dynamic';

// Generates a temporary signed URL for a project file.
// B2 is used for video originals & previews (storageKey starts with projectId/originals/ or projectId/previews/).
// Supabase Storage is used for non-video attachments (PDFs, images, docs).
export async function POST(req: Request) {
  try {
    const { projectId, fileName, expiresInSeconds, bucket } = await req.json();

    if (!projectId || !fileName) {
      return NextResponse.json({ error: 'Missing projectId or fileName' }, { status: 400 });
    }

    // Default: 7 days for preview, 14 days (1209600s) for post-acceptance download
    const ttl = expiresInSeconds ?? 60 * 60 * 24 * 7;

    // B2 path: fileName is already the full storageKey (e.g. projectId/previews/...)
    const isB2Key = fileName.includes('/previews/') || fileName.includes('/originals/');

    if (isB2Key) {
      const b2Bucket = fileName.includes('/previews/')
        ? B2_BUCKET_PREVIEWS()
        : B2_BUCKET_ORIGINALS();

      const signedUrl = await getSignedUrl(
        b2(),
        new GetObjectCommand({ Bucket: b2Bucket, Key: fileName }),
        { expiresIn: ttl },
      );

      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      return NextResponse.json({ signedUrl, expiresAt, expiresInSeconds: ttl });
    }

    // Supabase Storage fallback for non-video attachments
    const storagePath = `${projectId}/${encodeURIComponent(fileName)}`;
    const { data, error } = await supabase.storage
      .from(bucket ?? 'project-files')
      .createSignedUrl(storagePath, ttl);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? 'Failed to generate URL' }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return NextResponse.json({ signedUrl: data.signedUrl, expiresAt, expiresInSeconds: ttl });
  } catch (err) {
    console.error('generate-signed-url error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
