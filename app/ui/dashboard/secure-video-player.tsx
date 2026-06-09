'use client';
import { useEffect, useRef, useState } from 'react';

// 3×3 grid positions for watermark placement (Section 5 — dynamic visible watermark)
const GRID: React.CSSProperties[] = [
  { top: '14%', left: '14%' }, { top: '14%', left: '50%' }, { top: '14%', left: '83%' },
  { top: '50%', left: '14%' }, { top: '50%', left: '50%' }, { top: '50%', left: '83%' },
  { top: '83%', left: '14%' }, { top: '83%', left: '50%' }, { top: '83%', left: '83%' },
];

type WmState = { visible: boolean; text: string; pos: React.CSSProperties; opacity: number };

export default function SecureVideoPlayer({
  storageKey,
  projectId,
  editorName,
}: {
  storageKey: string;
  projectId: string;
  editorName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [wm, setWm] = useState<WmState>({ visible: false, text: '', pos: GRID[4], opacity: 0.28 });

  const wmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = useRef(Math.random().toString(36).slice(2, 10));
  const seekFrom = useRef(0);
  const name = editorName || 'Editor';

  // Fetch B2 signed URL on mount
  useEffect(() => {
    fetch('/api/generate-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName: storageKey, expiresInSeconds: 3600 }),
    })
      .then(r => r.json())
      .then(d => { if (d.signedUrl) setSrc(d.signedUrl); else setLoadError('Preview unavailable.'); })
      .catch(() => setLoadError('Preview unavailable.'))
      .finally(() => setLoading(false));
  }, [storageKey, projectId]);

  function showWatermark(durationSec?: number) {
    if (wmTimer.current) clearTimeout(wmTimer.current);
    const duration = durationSec ?? 5 + Math.floor(Math.random() * 26); // 5–30 s
    const pos = GRID[Math.floor(Math.random() * GRID.length)];
    const opacity = 0.25 + Math.random() * 0.10; // 25–35 %
    const sid = sessionId.current;
    const today = new Date().toLocaleDateString('en-CA');
    const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const variants = [name, `${name} · ${sid}`, `${name} · ${today}`, `${name} · ${ts}`];
    const text = variants[Math.floor(Math.random() * variants.length)];
    setWm({ visible: true, text, pos, opacity });
    wmTimer.current = setTimeout(() => setWm(w => ({ ...w, visible: false })), duration * 1000);
  }

  function log(type: string, extra?: Record<string, unknown>) {
    fetch('/api/viewing-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        sessionId: sessionId.current,
        type,
        timestamp: new Date().toISOString(),
        ...extra,
      }),
    }).catch(() => {});
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    log('session_start');

    const onPlay = () => { showWatermark(); log('play', { currentTime: video.currentTime }); };
    const onPause = () => log('pause', { currentTime: video.currentTime });
    const onSeeking = () => { seekFrom.current = video.currentTime; };
    const onSeeked = () => {
      showWatermark();
      log('seek', { currentTime: video.currentTime, seekFrom: seekFrom.current });
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);

    return () => {
      log('session_end', { currentTime: video.currentTime });
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [src]);

  // Tab focus → trigger watermark on return
  useEffect(() => {
    const onFocus = () => {
      if (videoRef.current && !videoRef.current.paused) showWatermark();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [name]);

  if (loading) {
    return (
      <div style={{ background: '#0a0a0a', borderRadius: 10, padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>Loading secure preview…</div>
      </div>
    );
  }

  if (loadError || !src) {
    return (
      <div style={{ background: '#0a0a0a', borderRadius: 10, padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>{loadError || 'Preview not available.'}</div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', userSelect: 'none' }}
      onMouseEnter={() => showWatermark(5)}
    >
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        loop={false}
        style={{ width: '100%', display: 'block', maxHeight: 500 }}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Dynamic visible watermark overlay — Section 5 */}
      {wm.visible && (
        <div
          style={{
            position: 'absolute',
            ...wm.pos,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: `rgba(255,255,255,${wm.opacity.toFixed(2)})`,
            letterSpacing: '0.04em',
            textShadow: '0 1px 4px rgba(0,0,0,0.65)',
            whiteSpace: 'nowrap',
          }}
        >
          {wm.text}
        </div>
      )}

      {/* Bottom label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 12px',
        fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
        letterSpacing: '0.06em', textAlign: 'right',
        pointerEvents: 'none', zIndex: 9,
      }}>
        PROTECTED PREVIEW — SECURED BY COREDON
      </div>
    </div>
  );
}
