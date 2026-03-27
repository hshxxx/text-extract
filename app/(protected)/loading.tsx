export default function ProtectedLoading() {
  return (
    <div className="page-shell">
      <header className="app-header">
        <div className="stack" style={{ gap: 10 }}>
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-subtitle" />
        </div>
        <div className="stack" style={{ gap: 12, alignItems: "flex-end" }}>
          <div className="nav-links">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton-pill" />
            ))}
          </div>
          <div className="skeleton-pill" style={{ width: 108 }} />
        </div>
      </header>

      <div className="grid-2">
        <section className="panel stack">
          <div className="skeleton-line skeleton-heading" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-subtitle" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </section>
        <section className="panel stack">
          <div className="skeleton-line skeleton-heading" />
          <div className="skeleton-card" style={{ minHeight: 220 }} />
          <div className="skeleton-card" />
        </section>
      </div>
    </div>
  );
}
