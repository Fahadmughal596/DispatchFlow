"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function openNotificationAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const notification = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!notification) return;

  await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  redirect(notification.url || "/");
}
