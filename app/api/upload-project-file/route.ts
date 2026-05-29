import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import supabase from '@/app/lib/supabase';
import { b2, B2_BUCKET_ORIGINALS } from '@/app/lib/b2';

export const dynamic = 'force-dynamic';

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'mxf', 'webm'];
const ACCEPTED_VIDEO_TYPES = new Set(VIDEO_EXTS);

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    // ── Video upload: return a B2 presigned PUT URL (browser uploads directly) ──
    if (contentType.includes('application/json')) {
      const { projectId, fileName, fileSize, mimeType } = await req.json();

      if (!projectId || !fileName) {
        return NextResponse.json({ error: 'Missing projectId or fileName' }, { status: 400 });
      }

      const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED_VIDEO_TYPES.has(ext)) {
        return NextResponse.json({ error: 'Only video files use direct upload' }, { status: 400 });
      }

      const storageKey = `${projectId}/originals/${Date.now()}-${fileName}`;

      const presignedUrl = await getSignedUrl(
        b2(),
        new PutObjectCommand({
          Bucket: B2_BUCKET_ORIGINALS(),
          Key:    storageKey,
          ContentType: mimeType || 'video/mp4',
          ContentLength: fileSize,
        }),
        { expiresIn: 3600 },
      );

      // Record in DB with pending status — RunPod picks this up after upload
      const date = new Date().toISOString().slice(0, 10);
      await supabase.from('coredon_project_files').insert({
        project_id: projectId,
        name:       fileName,
        date,
        type:       'video',
        url:        storageKey, // B2 key, not a public URL
      });

      await supabase.from('coredon_project_versions').insert({
        project_id: projectId,
        date,
        note: fileName,
      });

      return NextResponse.json({
        method:      'direct',
        presignedUrl,
        storageKey,
        name:        fileName,
      });
    }

    // ── Non-video upload: server-side upload to Supabase Storage ──
    const formData = await req.formData();
    const file      = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const fileType: 'pdf' | 'video' | 'image' | 'doc' =
      ext === 'pdf' ? 'pdf' :
      ACCEPTED_VIDEO_TYPES.has(ext) ? 'video' :
      ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? 'image' : 'doc';

    const storagePath = `${projectId}/${file.name}`;

    await supabase.storage
      .createBucket('project-files', { public: true })
      .catch(() => {});

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const date = new Date().toISOString().slice(0, 10);

    const { error: dbError } = await supabase.from('coredon_project_files').insert({
      project_id: projectId,
      name: file.name,
      date,
      type: fileType,
    });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await supabase.from('coredon_project_versions').insert({
      project_id: projectId,
      date,
      note: file.name,
    });

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/project-files/${storagePath}`;

    return NextResponse.json({ method: 'server', success: true, url: publicUrl, name: file.name });
  } catch (err) {
    console.error('upload-project-file error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
