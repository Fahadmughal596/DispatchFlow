import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="card" style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 style={{ fontSize: 44 }}>404</h1>
        <p className="text-muted">The requested portal resource was not found.</p>
        <Link className="btn btn-primary" href="/">Return home</Link>
      </div>
    </main>
  );
}
