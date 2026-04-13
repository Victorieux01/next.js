export default function ClientNotFound() {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>404</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Project not found</div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        This project link may be invalid or has been removed.
      </div>
    </div>
  );
}
