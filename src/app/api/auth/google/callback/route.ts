import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assignRoundRobin } from "@/lib/assignment";
import { audit } from "@/lib/audit";
import { createSession, destinationForUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureRequiredDocumentRequests } from "@/lib/required-documents";
import { googleRedirectUri, publicAppUrl } from "@/lib/google-oauth";

const stateCookie = "dispatchflow_google_state";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = publicAppUrl(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get(stateCookie)?.value;
  store.delete(stateCookie);

  if (!code || !returnedState || returnedState !== expectedState) {
    return NextResponse.redirect(
      new URL("/signup?error=Google+signup+could+not+be+verified.", appUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/signup?error=Google+signup+is+not+configured+yet.", appUrl)
    );
  }

  const redirectUri = googleRedirectUri(request.url);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }),
    cache: "no-store"
  });

  const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    return NextResponse.redirect(
      new URL("/signup?error=Google+did+not+complete+the+signup.", appUrl)
    );
  }

  const infoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokenPayload.access_token}` },
    cache: "no-store"
  });
  const info = (await infoResponse.json()) as GoogleUserInfo;

  if (!infoResponse.ok || !info.sub || !info.email || info.email_verified === false) {
    return NextResponse.redirect(
      new URL("/signup?error=A+verified+Google+email+is+required.", appUrl)
    );
  }

  const email = info.email.toLowerCase();
  let user = await db.user.findFirst({
    where: { OR: [{ googleSubject: info.sub }, { email }] },
    include: { truckerProfile: true, consultantProfile: true }
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    const created = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          role: "TRUCKER",
          name: info.name?.trim() || email.split("@")[0],
          email,
          passwordHash,
          googleSubject: info.sub,
          authProvider: "GOOGLE",
          emailVerifiedAt: new Date()
        }
      });
      const trucker = await tx.truckerProfile.create({ data: { userId: newUser.id } });
      const lead = await tx.lead.create({
        data: {
          truckerId: trucker.id,
          source: "GOOGLE_SIGNUP",
          currentStatus: "LEAD_SIGNED_UP"
        }
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          status: "LEAD_SIGNED_UP",
          changedBy: newUser.id,
          note: "Created from Google signup."
        }
      });
      return { newUser, trucker };
    });

    await assignRoundRobin(created.trucker.id, created.newUser.id);
    await ensureRequiredDocumentRequests(created.trucker.id, created.newUser.id);
    await audit(created.newUser.id, "TRUCKER_GOOGLE_SIGNUP", "User", created.newUser.id);

    user = await db.user.findUniqueOrThrow({
      where: { id: created.newUser.id },
      include: { truckerProfile: true, consultantProfile: true }
    });
  } else if (!user.googleSubject) {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        googleSubject: info.sub,
        authProvider: user.authProvider === "EMAIL" ? "EMAIL+GOOGLE" : "GOOGLE",
        emailVerifiedAt: user.emailVerifiedAt || new Date()
      },
      include: { truckerProfile: true, consultantProfile: true }
    });
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  return NextResponse.redirect(new URL(destinationForUser(user), appUrl));
}
