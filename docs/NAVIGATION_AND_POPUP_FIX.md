# Navigation and Trucker Popup Fix

## Protected navigation
- Added a no-store session endpoint.
- Protected layouts now verify the live session on mount, browser back/forward, BFCache restore, and tab visibility changes.
- After sign-out, stale protected pages are replaced with the login screen.
- Logout now redirects directly to the login page.

## Trucker profile popup
- Close and Complete later now dismiss reliably.
- Dismissal is stored in sessionStorage for the current browser session.
- The reminder returns in a new browser session until the profile is completed.
- Clicking the backdrop also closes the popup.
