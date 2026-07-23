import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { redirectAuthenticated } from "@/lib/auth";
import { Flash } from "@/components/flash";
import { PasswordField } from "@/components/password-field";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectAuthenticated();
  const params = await searchParams;

  return (
    <>
      <div className="auth-heading">
        <span className="auth-kicker">Trucker registration</span>
        <h1>Create your account</h1>
        <p>
          Choose a username that will appear inside your DispatchFlow portal
          instead of your email address.
        </p>
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
        <span>or continue with email</span>
      </div>

      <form action={signupAction} className="auth-form">
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={24}
            autoComplete="username"
            placeholder="e.g. roadking47"
            pattern="[A-Za-z0-9._-]+"
          />
          <span className="hint">
            3–24 characters. Letters, numbers, dots, dashes and underscores only.
          </span>
        </div>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <PasswordField
          name="password"
          label="Password"
          minLength={8}
          autoComplete="new-password"
        />

        <PasswordField
          name="passwordConfirmation"
          label="Confirm password"
          minLength={8}
          autoComplete="new-password"
        />

        <div className="auth-consent-group">
          <label className="checkbox auth-policy-checkbox">
            <input name="termsAccepted" type="checkbox" required />
            <span>
              I have read and agree to the{" "}
              <Link className="link" href="/terms" target="_blank">
                Terms &amp; Conditions
              </Link>
              .
            </span>
          </label>

          <label className="checkbox auth-policy-checkbox">
            <input name="privacyAccepted" type="checkbox" required />
            <span>
              I have read and agree to the{" "}
              <Link className="link" href="/privacy" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        <button className="btn btn-primary auth-submit-button">
          Sign Up with Email
        </button>
      </form>

      <p className="text-small text-muted auth-switch-text">
        Already registered?{" "}
        <Link className="link" href="/login">
          Log in
        </Link>
      </p>
    </>
  );
}
