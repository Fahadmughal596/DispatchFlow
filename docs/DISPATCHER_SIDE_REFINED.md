# DispatchFlow Dispatcher Side — Refined Build

## Final flow
Login → Dashboard → optional profile-completion popup → assigned truckers → contact → agreement/contract → pending invoice → paid invoice → active client.

## Included dispatcher routes
- `/consultant/dashboard` — performance, commission, alerts, recent truckers
- `/consultant/leads` — client workflow and internal notes
- `/consultant/truckers` — assigned trucker cards
- `/consultant/chat` — text, picture and document attachments
- `/consultant/documents` — MC Permit, COI and Driver's License compliance
- `/consultant/invoices` — create, summarize and view invoices
- `/consultant/payments` — due invoices and payment history
- `/consultant/loads` — active, scheduled, previous and completed loads with filters and pagination
- `/consultant/profile` — profile and dispatch commission

## Important behavior
Dispatcher enters the dashboard immediately. An incomplete profile is handled by a repeatable dashboard popup and does not block access.
