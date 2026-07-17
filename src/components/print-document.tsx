export function PrintDocument({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="print-page">
      <div className="print-hide" style={{ marginBottom: 20 }}>
        <strong>Use Ctrl + P to print or save as PDF.</strong>
      </div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #172033", paddingBottom: 18, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: 0 }}>DispatchFlow</h1>
          <p style={{ margin: "4px 0 0" }}>Union Enterprises Pakistan</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {subtitle ? <p style={{ margin: "4px 0 0" }}>{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </main>
  );
}
