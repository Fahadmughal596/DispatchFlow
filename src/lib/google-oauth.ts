export function publicAppUrl(requestUrl: string) {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  return configured || new URL(requestUrl).origin;
}

export function googleRedirectUri(requestUrl: string) {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  return explicit || `${publicAppUrl(requestUrl)}/api/auth/google/callback`;
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
