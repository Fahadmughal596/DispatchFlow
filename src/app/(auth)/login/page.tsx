import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { redirectAuthenticated } from "@/lib/auth";
import { Flash } from "@/components/flash";
import { PasswordField } from "@/components/password-field";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectAuthenticated();
  const params = await searchParams;

  return (
    <>
      <div className="auth-heading">
        <span className="auth-kicker">Secure trucker access</span>
        <h1>Log in</h1>
        <p>Use your username, email account, or continue with Google.</p>
      </div>

      <Flash error={params.error} />

      <a
        className="btn btn-google"
        href="/api/auth/google/start"
        style={{ width: "100%" }}
      >
        Continue with Google
      </a>

      <div className="auth-divider">
        <span>or use username / email and password</span>
      </div>

      <form action={loginAction} className="auth-form">
        <div className="field">
          <label htmlFor="identifier">Username or email</label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            placeholder="Enter username or email"
          />
        </div>

        <PasswordField
          name="password"
          label="Password"
          autoComplete="current-password"
        />

        <button className="btn btn-primary auth-submit-button">
          Log in
        </button>
      </form>

      <p className="text-small text-muted auth-switch-text">
        New trucker?{" "}
        <Link className="link" href="/signup">
          Create your account
        </Link>
      </p>
    </>
  );
}
