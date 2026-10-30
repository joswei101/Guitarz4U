export function AuthShell({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <div className="card">
          <h1 style={{ fontSize: '1.9rem' }}>{title}</h1>
          {intro ? <div className="muted" style={{ marginBottom: 16 }}>{intro}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
