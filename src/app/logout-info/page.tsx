import Link from "next/link";
export default function LogoutInfo() {
  return (
    <div className="auth-page">
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Open your portal</h2>
        <p className="text-muted">Use the Sign out button at the bottom of the portal sidebar.</p>
        <Link className="btn btn-primary" href="/">Back</Link>
      </div>
    </div>
  );
}
