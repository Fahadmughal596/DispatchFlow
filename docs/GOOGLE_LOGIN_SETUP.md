# Google Login Setup (Trucker Accounts)

The Google OAuth routes are already implemented. You only need credentials from Google Cloud.

1. Open Google Cloud Console and create/select a project.
2. Open **APIs & Services → OAuth consent screen** and configure the app.
3. Open **Credentials → Create credentials → OAuth client ID**.
4. Select **Web application**.
5. Add this Authorized JavaScript origin for local development:
   `http://127.0.0.1:3000`
6. Add this Authorized redirect URI exactly:
   `http://127.0.0.1:3000/api/auth/google/callback`
7. Put the credentials in `.env`:

```env
APP_URL="http://127.0.0.1:3000"
GOOGLE_CLIENT_ID="paste-client-id"
GOOGLE_CLIENT_SECRET="paste-client-secret"
GOOGLE_REDIRECT_URI="http://127.0.0.1:3000/api/auth/google/callback"
```

8. Restart the Next.js server after changing `.env`.
9. Open `/signup` and click **Continue with Google**.

Google users are created as TRUCKER accounts, assigned through round-robin, sent directly to `/portal/dashboard`, and shown the profile completion popup. Existing email accounts with the same verified email are securely linked to Google.

Production requires HTTPS and production URLs in both Google Cloud and `.env`.
