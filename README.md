# DispatchFlow Next.js Portal - Requirements V2

This is the full-stack Next.js conversion of the DispatchFlow Laravel portal, updated from the latest trucker/dispatcher requirements.

## Final stack

- **Frontend and backend:** Next.js 16 App Router
- **UI:** React 19 + TypeScript + custom responsive CSS
- **Database:** MySQL or MariaDB
- **ORM:** Prisma 6.19.3
- **Mutations:** Next.js Server Actions
- **Private endpoints:** Next.js Route Handlers
- **Authentication:** email/password, Google OAuth 2.0, database-backed sessions, HTTP-only cookies
- **Authorization:** role layouts plus record-level ownership checks
- **File storage:** protected local `uploads/` storage for development
- **Package manager:** pnpm through Corepack

The application is a **modular monolith**: one deployable Next.js application, one MySQL database and three isolated role portals.

## Implemented from the latest requirements

### Signup and onboarding

- Email signup
- Google signup/login
- Email is used as the account identity
- Trucker onboarding screen before dashboard access
- Required profile fields: name, phone, equipment type, package type, location and billing method
- Fixed or percentage-based billing selection
- Dispatcher profile-completion screen with commission percentage

### Mandatory documents

Exactly these three documents are mandatory:

1. MC Permit
2. Certificate of Insurance (COI)
3. Driver's License

Missing, rejected, replacement-requested or expired documents remain incomplete. Alerts appear to the trucker, assigned Consultant / Dispatcher and Super Admin.

Allowed uploads:

- PDF
- DOC / DOCX
- JPG / JPEG
- PNG
- WEBP

Maximum size: 10MB. The server validates extension, MIME type and file signature.

Both the trucker and assigned Consultant / Dispatcher may upload or replace a trucker's documents. Super Admin can view every upload.

### Trucker dashboard

- Assigned Consultant / Dispatcher shown at the top
- Portal usage guidance
- Current-day activity/audit log
- Weekly and monthly load/payment summary
- Company, equipment, package and billing details

### Agreement and payment

- First-payment button is **Acknowledge & Pay**
- Read-more agreement section
- Typed signer name and acknowledgement checkbox
- Agreement record created during first successful payment
- Mandatory documents must be complete before payment
- First invoice receives a one-month aging grace date
- Demo payment flow remains provider-neutral for later gateway integration

### Invoices and payments

- Invoice summary cards
- View Invoice / printable invoice
- Due Invoices and Payment History are separate tabs
- Date-range filters
- Pagination
- Receipt and signed-agreement links

### Loads

- Active Loads
- Scheduled Loads
- Previous Loads
- Completed Loads
- Last Completed Load card
- Filter button
- Date-to-date filter
- Status filter
- Compulsory pagination
- Workflow statuses: Booked, Picked Up, Dropped Off and Cancelled
- Dispatcher may upload supporting load documents

### Chat

- Text chat
- Image attachments
- PDF/Word document attachments
- Protected attachment downloads
- Two-sided chat automatically validates Contact Made
- Super Admin chat audit remains read-only

### Dispatcher workflow

- Assigned leads and truckers only
- Profile completion and commission percentage
- Lead flow supports:
  - Assigned
  - Contact Made
  - Contract Made
  - Pending Invoice
  - Invoice Sent
  - Invoice Paid / Active
- Load creation remains restricted to active paid truckers

### Assignment rule retained from the main framework

New truckers are assigned through round-robin or Super Admin override. A dispatcher cannot claim an unrelated trucker. This preserves role isolation and the original portal security rule.

## Windows setup

### Requirements

- Node.js 22 LTS or newer
- Laragon with MySQL/MariaDB running
- PowerShell

Extract the ZIP outside OneDrive, for example:

```text
C:\Projects\dispatchflow_nextjs_portal
```

Open PowerShell inside the folder containing `package.json`:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\SETUP_WINDOWS.ps1
```

The script:

1. Creates `.env`
2. Installs dependencies with pnpm
3. Generates Prisma Client
4. Creates/updates the MySQL database and tables
5. Optionally loads demo accounts
6. Runs TypeScript and ESLint checks

Start the portal:

```powershell
corepack pnpm dev
```

Open:

```text
http://127.0.0.1:3000
```

> PowerShell command should be `./SETUP_WINDOWS.ps1` or `.\SETUP_WINDOWS.ps1`. If the rendered slash above appears unusual in a text editor, use `.\SETUP_WINDOWS.ps1`.

## Google signup configuration

Create a Google OAuth web application and register this callback URL for local development:

```text
http://127.0.0.1:3000/api/auth/google/callback
```

Then add credentials to `.env`:

```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

Restart the development server after changing `.env`.

## Demo accounts

### Super Admin

```text
superadmin@unionenterprises.pk
superadmin123
```

### Consultant / Dispatcher

```text
dispatcher1@unionenterprises.pk
password
```

### First-payment trucker

```text
trucker@example.com
password
```

### Active trucker

```text
active.trucker@example.com
password
```

## Useful commands

```powershell
corepack pnpm dev
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm exec prisma studio
corepack pnpm exec prisma db push
```

Do not run the demo seed against production data. The setup script asks before resetting/loading demo records.

## Production work still required

- Connect an eligible payment processor or merchant-of-record provider
- Add verified, idempotent payment webhooks
- Move private files to S3-compatible object storage
- Add antivirus scanning
- Add transactional email and invitation delivery
- Add password reset and email verification
- Add rate limiting, structured logs and error monitoring
- Add automated end-to-end tests
- Deploy behind HTTPS with a managed MySQL database and backups

See `docs/REQUIREMENTS_IMPLEMENTATION.md`, `docs/LARAVEL_TO_NEXTJS_MAPPING.md` and `docs/PRODUCTION_CHECKLIST.md`.

## Refined Dispatcher Side (July 2026)
The dispatcher portal now uses a premium responsive workspace, dashboard profile popup, commission reporting, assigned-trucker workflow, operational alerts, responsive navigation, and the existing documents, invoices, payments, loads and attachment-enabled chat modules. See `docs/DISPATCHER_SIDE_REFINED.md` and `RUN_DISPATCHER_FIRST.md`.
