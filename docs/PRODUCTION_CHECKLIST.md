# Production Checklist

## Payments

- [ ] Replace demo payment logic with an eligible processor or merchant-of-record adapter.
- [ ] Verify webhook signatures.
- [ ] Add idempotency for checkout and webhook events.
- [ ] Store provider transaction IDs, fees, refunds and disputes.
- [ ] Confirm legal wording for agreement acknowledgement/signature.

## Authentication

- [ ] Create production Google OAuth credentials.
- [ ] Register production callback URL: `https://YOUR-DOMAIN/api/auth/google/callback`.
- [ ] Add email verification and password reset.
- [ ] Add login/signup rate limiting and bot protection.
- [ ] Use secure cookies and HTTPS in production.

## Files and chat attachments

- [ ] Move private uploads to S3-compatible object storage.
- [ ] Add antivirus/malware scanning.
- [ ] Use signed download URLs or stream through an authorized API route.
- [ ] Add storage retention and deletion policies.

## Infrastructure

- [ ] Use a managed MySQL database with backups.
- [ ] Add migration/release procedure instead of relying only on `db push`.
- [ ] Configure transactional email.
- [ ] Add Sentry/error monitoring and structured logs.
- [ ] Add health checks and uptime monitoring.
- [ ] Run dependency/security audits.

## Testing

- [ ] Email signup and Google signup.
- [ ] Profile-completion redirects.
- [ ] Dispatcher ownership/authorization failures.
- [ ] Missing-document payment block.
- [ ] Chat image/document upload and download permissions.
- [ ] First-month invoice grace logic.
- [ ] Acknowledge & Pay transaction.
- [ ] Load tabs, filters, date range and pagination.
- [ ] Super Admin reports and audit trail.
