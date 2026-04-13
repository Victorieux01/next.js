import supabase from '@/app/lib/supabase';
import { notFound } from 'next/navigation';

export default async function PreviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const { data: project } = await supabase
    .from('coredon_projects')
    .select('id, name, email, description, amount, end_date, status')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const { data: files } = await supabase
    .from('coredon_project_files')
    .select('id, name, type, date')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  const { data: versions } = await supabase
    .from('coredon_project_versions')
    .select('id, note, date')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  const supabaseUrl = process.env.SUPABASE_URL!;
  const fileUrl = (name: string) =>
    `${supabaseUrl}/storage/v1/object/public/project-files/${projectId}/${encodeURIComponent(name)}`;

  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const videoTypes = ['.mp4', '.mov', '.webm'];

  function fileExt(name: string) {
    return name.slice(name.lastIndexOf('.')).toLowerCase();
  }

  const fmtAmount = (n: number) =>
    n.toLocaleString('fr-CA', { minimumFractionDigits: 2 }) + ' $';

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Preview — {project.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                 background: #f8fafc; color: #0f172a; }
          .watermark-wrap { position: relative; display: inline-block; width: 100%; }
          .watermark-wrap::after {
            content: 'DRAFT — NOT FOR DISTRIBUTION';
            position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: clamp(14px, 3vw, 28px); font-weight: 900;
            color: rgba(255,255,255,0.55); letter-spacing: 0.12em;
            text-transform: uppercase; pointer-events: none;
            background: repeating-linear-gradient(
              -45deg,
              transparent, transparent 60px,
              rgba(0,0,0,0.06) 60px, rgba(0,0,0,0.06) 61px
            );
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
          }
          .watermark-wrap img, .watermark-wrap video {
            display: block; width: 100%; border-radius: 10px;
            max-height: 520px; object-fit: contain; background: #000;
          }
          .file-badge { display: inline-flex; align-items: center; gap: 6px;
            background: #e0f2fe; color: #0369a1; border-radius: 6px;
            padding: 4px 10px; font-size: 12px; font-weight: 600; }
        `}</style>
      </head>
      <body>
        {/* Header */}
        <div style={{ background: '#0a0a0a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Coredon</span>
          <span style={{ background: '#fbbf24', color: '#78350f', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
            WATERMARKED PREVIEW
          </span>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

          {/* Project info */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '28px 32px', marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>{project.name}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{project.description}</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</span>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtAmount(parseFloat(String(project.amount)) || 0)}</div></div>
              <div><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deadline</span>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{project.end_date ?? '—'}</div></div>
              <div><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{project.status}</div></div>
            </div>
          </div>

          {/* Watermark notice */}
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 28, fontSize: 13, color: '#854d0e' }}>
            <strong>⚠ Preview only.</strong> All files below are watermarked. The final clean deliverable will be sent upon project approval.
          </div>

          {/* File previews */}
          {files && files.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {files.map(f => {
                const ext = fileExt(f.name);
                const url = fileUrl(f.name);
                const isImage = imageTypes.includes(ext);
                const isVideo = videoTypes.includes(ext);
                return (
                  <div key={f.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{f.date}</div>
                      </div>
                      <span className="file-badge">{ext.replace('.', '').toUpperCase()}</span>
                    </div>

                    {isImage && (
                      <div className="watermark-wrap" style={{ background: '#0f172a' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={f.name} />
                      </div>
                    )}

                    {isVideo && (
                      <div className="watermark-wrap" style={{ background: '#0f172a' }}>
                        <video controls preload="metadata" controlsList="nodownload">
                          <source src={url} type={ext === '.mp4' ? 'video/mp4' : ext === '.mov' ? 'video/quicktime' : 'video/webm'} />
                        </video>
                      </div>
                    )}

                    {!isImage && !isVideo && (
                      <div style={{ padding: '32px 20px', textAlign: 'center', background: '#f8fafc' }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                          This file type cannot be previewed in the browser.
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                          The final clean file will be delivered upon approval.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No files have been uploaded yet.
            </div>
          )}

          {/* Uploaded deliverables list */}
          {versions && versions.length > 0 && (
            <div style={{ marginTop: 28, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Deliverables History</div>
              {versions.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{v.note}</span>
                  <span style={{ color: '#94a3b8' }}>{v.date}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#cbd5e1' }}>
            Powered by <strong style={{ color: '#94a3b8' }}>Coredon</strong>
          </div>
        </div>
      </body>
    </html>
  );
}
