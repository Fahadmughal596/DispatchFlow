# Latest Requirements - Analysis and Implementation

## Requirement decisions

| Requirement | Implementation | Status |
|---|---|---|
| Google and email signup | Email/password signup plus direct Google OAuth 2.0 routes | Implemented |
| Onboarding/loading before dashboard | Role-aware onboarding routes block dashboard until profile completion | Implemented |
| Trucker profile popup/details | Dedicated onboarding screen with name, phone, equipment, package, location and billing fields | Implemented |
| Mandatory documents | MC Permit, COI and Driver's License | Implemented |
| Fourth document | Not enabled because its final name is still unconfirmed; it can be added in `src/lib/constants.ts` | Intentionally pending |
| Assigned dispatcher at top | Main trucker dashboard begins with the assigned dispatcher card | Implemented |
| Agreement Read More | First-payment screen contains agreement details/read-more content | Implemented |
| Acknowledge & Pay | First invoice action renamed and gated by acknowledgement/signature | Implemented |
| View Invoice and Invoice Summary | Summary cards plus printable invoice route | Implemented |
| Due invoices separate from history | Separate tabs on the Payments page | Implemented |
| Active/Scheduled/Previous/Completed loads | Four load tabs with last-completed card | Implemented |
| Load filters | Status and date-to-date filters | Implemented |
| Pagination | Required on load, invoice and payment lists | Implemented |
| Load status dropdown | Booked, Picked Up, Dropped Off, Cancelled | Implemented |
| Dispatcher commission | Percentage stored in basis points on dispatcher profile | Implemented |
| Dispatcher profile completion | Dedicated onboarding screen before workspace access | Implemented |
| Assigned flow | Contact Made, Contract Made, Pending Invoice, Invoice Sent, Invoice Paid/Active | Implemented |
| First-month invoice aging | First invoice aging starts one month after issue | Implemented |
| Chat images/documents | One protected image or document attachment per message | Implemented |
| Current-day activity | Trucker dashboard queries current-day audit records | Implemented |
| Weekly/monthly performance | Dashboard summary metrics for trucker and dispatcher | Implemented |
| Percentage billing signup | Fixed/percentage selection with required rate when percentage is selected | Implemented |

## Important security interpretation

The new notes mention “Dispatcher assigns trucker.” The main DispatchFlow framework previously established round-robin/Super Admin assignment and prohibited dispatchers from claiming unrelated truckers. The conversion keeps that secure rule:

1. Signup creates the trucker and lead.
2. Round-robin assigns an eligible Consultant / Dispatcher.
3. Super Admin may override/reassign.
4. Dispatcher can manage only assigned truckers.

## Payment limitation

The portal contains the complete application-side state transition for Acknowledge & Pay, agreement creation, invoice payment, receipt and account activation. The payment provider itself is still a demo/provider-neutral adapter and must be replaced before production.

## Fourth document

The requirements document leaves the fourth mandatory title unconfirmed. The current production rule therefore contains exactly:

- MC Permit
- Certificate of Insurance (COI)
- Driver's License

To add the fourth later, update `REQUIRED_DOCUMENT_TYPES` in `src/lib/constants.ts`; the checklist and missing-document alert system derive from that single source.

## Corrected trucker entry behavior

- Email and Google trucker login always redirect to `/portal/dashboard`.
- New trucker signup also lands directly on `/portal/dashboard`.
- An incomplete trucker profile never blocks entry with a separate onboarding page.
- The dashboard displays a dismissible profile-completion popup.
- If dismissed without completion, the popup appears again on the next dashboard visit or refresh.
- Completing the form removes the popup permanently by setting `profileCompletedAt`.
