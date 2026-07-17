import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role, type ConsultantProfile, type TruckerProfile, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_HOME } from "@/lib/constants";
import { sha256, token } from "@/lib/utils";

const cookieName = process.env.SESSION_COOKIE_NAME || "dispatchflow_next_session";
const sessionDays = Number(process.env.SESSION_DAYS || 30);

export type AuthenticatedUser = User & {
  truckerProfile: TruckerProfile | null;
  consultantProfile: ConsultantProfile | null;
};

export function destinationForUser(user: AuthenticatedUser) {
  // Truckers always enter their dashboard first. An incomplete profile is
  // handled by a persistent dashboard popup instead of a blocking redirect.
  if (user.role === "TRUCKER") {
    return ROLE_HOME.TRUCKER;
  }

  return ROLE_HOME[user.role];
}

export async function createSession(userId: number) {
  const rawToken = token();
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: { tokenHash: sha256(rawToken), userId, expiresAt }
  });

  const store = await cookies();
  store.set(cookieName, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroySession() {
  const store = await cookies();
  const rawToken = store.get(cookieName)?.value;

  if (rawToken) {
    await db.session.deleteMany({ where: { tokenHash: sha256(rawToken) } });
  }

  store.delete(cookieName);
}

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const store = await cookies();
  const rawToken = store.get(cookieName)?.value;
  if (!rawToken) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: {
      user: {
        include: {
          truckerProfile: true,
          consultantProfile: true
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect(destinationForUser(user));
  return user;
}

export async function redirectAuthenticated() {
  const user = await currentUser();
  if (user) redirect(destinationForUser(user));
}
