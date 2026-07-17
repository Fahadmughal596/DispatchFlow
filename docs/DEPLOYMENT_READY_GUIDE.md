# DispatchFlow deployment guide

## Required services
- Node.js 22 LTS or newer
- MySQL 8 / compatible managed MySQL
- Persistent file storage for `UPLOAD_DIR` (local disk is development-only)

## Production setup
1. Copy `.env.example` to `.env` and enter production values.
2. Set `APP_URL` and `GOOGLE_REDIRECT_URI` to the HTTPS production domain.
3. Create the MySQL database and run:
   - `corepack pnpm install --frozen-lockfile`
   - `corepack pnpm prisma generate`
   - `corepack pnpm prisma db push`
   - `corepack pnpm build`
4. Start with `corepack pnpm start`.

## Uploads
The included upload directory works on a persistent VPS. Serverless hosts with ephemeral filesystems require S3/Cloudinary-compatible storage before production document uploads.

## Security
- Never commit `.env`.
- Use a unique long `SESSION_SECRET`.
- Enable HTTPS.
- Restrict database network access.
- Configure backups and webhook secrets before enabling real payments.

## Post-deployment checks
- Email and Google login
- Role redirects and protected-route logout behavior
- Mobile sidebar, notification menu, profile menu and sign-out
- Equipment category selection and displayed commission
- Document uploads and downloads
- Invoice/payment provider webhooks
- Date filters on leads, invoices, payments and loads
