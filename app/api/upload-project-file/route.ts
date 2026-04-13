import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file      = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const fileType: 'pdf' | 'video' | 'image' | 'doc' =
      ext === 'pdf' ? 'pdf' :
      ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ? 'video' :
      ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? 'image' : 'doc';

    const storagePath = `${projectId}/${file.name}`;

    // Create bucket if it doesn't exist yet (error ignored if already exists)
    await supabase.storage
      .createBucket('project-files', { public: true })
      .catch(() => {});

    // Upload file to Supabase Storage
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

    // Record in coredon_project_files
    const { error: dbError } = await supabase.from('coredon_project_files').insert({
      project_id: projectId,
      name: file.name,
      date,
      type: fileType,
    });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Also record a version entry so it shows in the timeline
    await supabase.from('coredon_project_versions').insert({
      project_id: projectId,
      date,
      note: file.name,
    });

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/project-files/${storagePath}`;

    return NextResponse.json({ success: true, url: publicUrl, name: file.name });
  } catch (err) {
    console.error('upload-project-file error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
