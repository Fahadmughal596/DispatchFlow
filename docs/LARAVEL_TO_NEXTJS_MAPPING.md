# Laravel to Next.js Conversion Mapping

The Laravel codebase was converted as a full-stack Next.js modular monolith rather than as a frontend-only rewrite.

| Laravel implementation | Next.js implementation |
|---|---|
| `routes/web.php` | App Router folders under `src/app` |
| Blade templates | React Server Components (`page.tsx`, `layout.tsx`) |
| Livewire components | Server Components + Server Actions + focused Client Components |
| Controllers | Server Actions in `src/actions` and Route Handlers under `src/app/api` |
| Form Requests/validation | Zod schemas plus server-side file validation |
| Eloquent models | Prisma models in `prisma/schema.prisma` |
| Eloquent relationships | Prisma relations and `include`/`select` queries |
| Laravel middleware | Protected role layouts plus `requireRole()`/`requireUser()` |
| Policies/Gates | Resource ownership checks in actions and route handlers |
| Laravel sessions | Database-backed session tokens in HTTP-only cookies |
| Socialite | Direct Google OAuth 2.0 start/callback Route Handlers |
| Laravel Notifications | `Notification` Prisma model and notification dropdown |
| Laravel private disk | Local private `uploads/` plus permission-controlled download handlers |
| Livewire polling chat | Client polling plus a protected chat JSON Route Handler |
| Uploaded-file validation | Extension, MIME and signature validation in server actions |
| Queued domain flow | Transactional Prisma writes; production can later add a queue service |
| Database migrations/seeders | Prisma schema, `prisma db push/migrate` and `prisma/seed.ts` |
| Artisan commands | pnpm and Prisma scripts |

## Conversion architecture

```text
Browser
  -> Next.js App Router page/layout
  -> Server Action or Route Handler
  -> Authentication + role/ownership check
  -> Domain helper/service
  -> Prisma Client
  -> MySQL/MariaDB
```

## Route separation

```text
/portal/*       Trucker
/consultant/*   Consultant / Dispatcher
/super-admin/*  Super Admin
```

Each role layout verifies the session and role server-side. Dispatcher queries additionally filter every trucker-owned resource by `assignedConsultantId`.

## Feature-specific conversions

### Authentication

- Laravel login/register -> `src/actions/auth.ts`
- Google Socialite-style flow -> `src/app/api/auth/google/*`
- Role redirect -> `destinationForUser()` in `src/lib/auth.ts`
- Profile-completion redirect -> role layouts and onboarding routes

### Documents

- Document request/upload/review -> `src/actions/documents.ts`
- Mandatory checklist -> `src/lib/required-documents.ts`
- Protected download -> `src/app/api/documents/[documentId]/route.ts`

### Chat

- Messages -> `Message` Prisma model
- Attachments -> `MessageAttachment` Prisma model
- Send action -> `src/actions/chat.ts`
- Polling endpoint -> `src/app/api/chat/[conversationId]/route.ts`
- Protected attachment endpoint -> `src/app/api/chat-attachments/[attachmentId]/route.ts`

### Agreement, invoice and payment

- Invoice actions -> `src/actions/invoices.ts`
- Invoice/aging helpers -> `src/lib/portal-filters.ts`
- First payment creates agreement, payment, receipt and active status in one Prisma transaction

### Loads

- Load actions -> `src/actions/loads.ts`
- Active/Scheduled/Previous/Completed filters -> `src/lib/portal-filters.ts`
- Pagination component -> `src/components/pagination.tsx`

## Preserved business rules

- Round-robin assignment is neutral unless Super Admin overrides it.
- Contact Made is derived only after both sides send a message.
- Dispatcher sees and modifies assigned truckers only.
- Mandatory documents must be complete before first payment.
- Loads can be created only for active/paid truckers.
- First payment records acknowledgement and agreement.
- Payment history and due invoices are separate views.
