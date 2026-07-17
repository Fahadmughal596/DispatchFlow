"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destinationForUser,
  destroySession,
  redirectAuthenticated
} from "@/lib/auth";
import { assignRoundRobin } from "@/lib/assignment";
import { ensureRequiredDocumentRequests } from "@/lib/required-documents";
import { audit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  passwordConfirmation: z.string().min(8).max(100),
  consent: z.literal("on")
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Passwords do not match.",
  path: ["passwordConfirmation"]
});

function provisionalName(email: string) {
  const local = email.split("@")[0] || "New Trucker";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "New Trucker";
}

export async function loginAction(formData: FormData) {
  await redirectAuthenticated();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=Enter+a+valid+email+and+password.");

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { truckerProfile: true, consultantProfile: true }
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !user.passwordHash ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    redirect("/login?error=Incorrect+email+or+password.");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await createSession(user.id);
  redirect(destinationForUser(user));
}

export async function signupAction(formData: FormData) {
  await redirectAuthenticated();
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Complete the email signup form.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) redirect("/signup?error=An+account+with+this+email+already+exists.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: "TRUCKER",
        name: provisionalName(email),
        email,
        passwordHash,
        authProvider: "EMAIL"
      }
    });
    const trucker = await tx.truckerProfile.create({
      data: { userId: user.id }
    });
    const lead = await tx.lead.create({
      data: {
        truckerId: trucker.id,
        source: "EMAIL_SIGNUP",
        currentStatus: "LEAD_SIGNED_UP"
      }
    });
    await tx.leadStatusHistory.create({
      data: {
        leadId: lead.id,
        status: "LEAD_SIGNED_UP",
        changedBy: user.id,
        note: "Created from email signup."
      }
    });
    return { user, trucker };
  });

  await assignRoundRobin(result.trucker.id, result.user.id);
  await ensureRequiredDocumentRequests(result.trucker.id, result.user.id);
  await audit(result.user.id, "TRUCKER_SIGNED_UP", "User", result.user.id);
  await createSession(result.user.id);
  redirect("/portal/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login?message=You+have+been+signed+out.");
}
