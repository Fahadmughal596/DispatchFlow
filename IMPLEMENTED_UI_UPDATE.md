# DispatchFlow UI Update

Implemented in this bundle:

- Added the supplied trucker-facing landing page as the root `/` page.
- Preserved the existing authentication and portal routes.
- Updated the trucker dashboard visual treatment to closely match the supplied premium dark interface.
- Preserved the previously requested dispatcher-card behavior and data:
  - icon instead of profile image
  - green dot only when recently online
  - prominent dispatcher name
  - expertise
  - phone/contact
  - active/online/paused status
  - total loads (profile base + actual created loads)
  - service duration
- Preserved the requested dashboard filter placement below the dispatcher/chat card and above KPI cards.
- Preserved the three-step trucker profile completion flow and compact sidebar work already present.

Run `pnpm install`, `pnpm run typecheck`, and `pnpm build` before deployment.
