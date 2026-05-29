import { NextResponse } from 'next/server';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import supabase from '@/app/lib/supabase';
import { b2, B2_BUCKET_ORIGINALS, B2_BUCKET_PREVIEWS } from '@/app/lib/b2';

export const dynamic = 'force-dynamic';

// Vercel Cron — runs daily at 03:00 UTC.
// Deletes B2 video files (originals + previews) and Supabase attachments for
// projects Released more than 14 days ago.
// Contract PDF + metadata remain in Supabase indefinitely.
//
// vercel.json: { "crons": [{ "path": "/api/cleanup-expired", "schedule": "0 3 * * *" }] }
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  try {
    const { data: projects, error: projectsErr } = await supabase
      .from('coredon_projects')
      .select('id, released_date')
      .eq('status', 'Released')
      .lte('released_date', cutoffStr)
      .not('released_date', 'is', null);

    if (projectsErr) throw new Error(projectsErr.message);
    if (!projects || projects.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No expired projects found' });
    }

    let totalDeleted = 0;
    const errors: string[] = [];
    let b2Client: ReturnType<typeof b2> | null = null;
    try { b2Client = b2(); } catch { /* B2 not configured — skip B2 deletion */ }

    for (const project of projects) {
      try {
        // ── B2 deletion (videos) ──
        if (b2Client) {
          const { data: videoFiles } = await supabase
            .from('coredon_project_files')
            .select('url')
            .eq('project_id', project.id)
            .eq('type', 'video')
            .not('url', 'is', null);

          const b2Keys = (videoFiles ?? [])
            .map(f => f.url as string)
            .filter(u => u.includes('/originals/') || u.includes('/previews/'));

          const originalsKeys = b2Keys.filter(k => k.includes('/originals/'));
          const previewsKeys  = b2Keys.filter(k => k.includes('/previews/'));

          const deleteFromBucket = async (bucket: string, keys: string[]) => {
            if (keys.length === 0) return;
            await b2Client!.send(new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: keys.map(Key => ({ Key })) },
            }));
            totalDeleted += keys.length;
          };

          await deleteFromBucket(B2_BUCKET_ORIGINALS(), originalsKeys);
          await deleteFromBucket(B2_BUCKET_PREVIEWS(),  previewsKeys);
        }

        // ── Supabase Storage deletion (non-video attachments) ──
        const { data: files, error: listErr } = await supabase.storage
          .from('project-files')
          .list(project.id);

        if (!listErr && files && files.length > 0) {
          const paths = files.map(f => `${project.id}/${f.name}`);
          const { error: deleteErr } = await supabase.storage
            .from('project-files')
            .remove(paths);
          if (deleteErr) {
            errors.push(`Supabase ${project.id}: ${deleteErr.message}`);
          } else {
            totalDeleted += paths.length;
          }
        }
      } catch (err) {
        errors.push(`Project ${project.id}: ${String(err)}`);
      }
    }

    return NextResponse.json({
      deleted: totalDeleted,
      projectsChecked: projects.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('cleanup-expired error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
