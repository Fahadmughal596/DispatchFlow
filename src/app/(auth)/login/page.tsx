import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { redirectAuthenticated } from "@/lib/auth";
import { Flash } from "@/components/flash";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectAuthenticated();
  const params = await searchParams;

  return (
    <>
      <h1>Log in</h1>
      <p>Use your email account or continue with Google.</p>
      <Flash error={params.error} />

      <a className="btn btn-google" href="/api/auth/google/start" style={{ width: "100%" }}>
        Continue with Google
      </a>

      <div className="auth-divider"><span>or use email and password</span></div>

      <form action={loginAction}>
        <div className="field">
          <label>Email address</label>
          <input name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label>Password</label>
          <input name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }}>Log in</button>
      </form>
      <p className="text-small text-muted" style={{ marginTop: 18 }}>
        New trucker? <Link className="link" href="/signup">Create your account</Link>
      </p>
    </>
  );
}
