import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleRedirectUri, publicAppUrl } from "@/lib/google-oauth";

const stateCookie = "dispatchflow_google_state";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = publicAppUrl(request.url);

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/signup?error=Google+signup+is+not+configured+yet.", appUrl)
    );
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = googleRedirectUri(request.url);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  });
  return response;
}
