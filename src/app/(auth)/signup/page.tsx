import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { redirectAuthenticated } from "@/lib/auth";
import { Flash } from "@/components/flash";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectAuthenticated();
  const params = await searchParams;

  return (
    <>
      <h1>Create your account</h1>
      <p>Use email or Google. Profile and truck details are completed after signup.</p>
      <Flash error={params.error} />

      <a className="btn btn-google" href="/api/auth/google/start" style={{ width: "100%" }}>
        Continue with Google
      </a>

      <div className="auth-divider"><span>or continue with email</span></div>

      <form action={signupAction}>
        <div className="field">
          <label>Email address</label>
          <input name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label>Password</label>
          <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input name="passwordConfirmation" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <label className="checkbox">
          <input name="consent" type="checkbox" required />
          <span>I agree to be contacted for consultation / dispatch.</span>
        </label>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }}>
          Sign Up with Email
        </button>
      </form>

      <p className="text-small text-muted" style={{ marginTop: 18 }}>
        Already registered? <Link className="link" href="/login">Log in</Link>
      </p>
    </>
  );
}
