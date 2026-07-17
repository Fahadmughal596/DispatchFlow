"use client";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth-page">
      <div className="card" style={{ maxWidth: 620 }}>
        <h2>Something went wrong</h2>
        <p className="text-muted">{error.message || "An unexpected portal error occurred."}</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
