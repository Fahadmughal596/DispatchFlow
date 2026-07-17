# Make Google Login Work

1. Start MySQL in Laragon.
2. Copy `.env.example` to `.env` if `.env` does not exist.
3. In Google Cloud Console create a Web OAuth client.
4. Authorized JavaScript origin: `http://127.0.0.1:3000`
5. Authorized redirect URI: `http://127.0.0.1:3000/api/auth/google/callback`
6. Fill these values in `.env`:

```env
APP_URL="http://127.0.0.1:3000"
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="http://127.0.0.1:3000/api/auth/google/callback"
```

7. Run:

```powershell
corepack pnpm install
corepack pnpm prisma generate
corepack pnpm prisma db push
corepack pnpm run typecheck
corepack pnpm dev
```

8. Open `http://127.0.0.1:3000/signup` and click Continue with Google.
