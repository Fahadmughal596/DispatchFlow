import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <Link className="brand" href="/">
            <span className="brand-mark">DF</span>
            <span>DispatchFlow<small>Secure portal access</small></span>
          </Link>
          <div>
            <h2>Three portals.<br />One controlled workflow.</h2>
            <p className="text-muted">Trucker, Consultant / Dispatcher and Super Admin access share one secure MySQL backend.</p>
          </div>
          <small className="text-muted">Union Enterprises Pakistan</small>
        </aside>
        <section className="auth-main">{children}</section>
      </div>
    </main>
  );
}
