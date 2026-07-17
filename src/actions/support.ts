"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function contactSuperAdminAction(formData: FormData) {
  const user = await requireRole("TRUCKER");
  const subject = clean(formData.get("subject"), 120);
  const message = clean(formData.get("message"), 3000);

  if (!subject || !message) {
    redirect("/portal/support?error=Please+enter+both+a+subject+and+a+message.");
  }

  const admins = await db.user.findMany({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { id: true }
  });

  const log = await db.auditLog.create({
    data: {
      actorId: user.id,
      action: "TRUCKER_CONTACTED_SUPER_ADMIN",
      entityType: "SupportRequest",
      entityId: String(user.id),
      newValue: {
        subject,
        message,
        truckerName: user.name,
        truckerEmail: user.email
      }
    }
  });

  if (admins.length) {
    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: `Support request: ${subject}`,
        message: `${user.name} (${user.email}) contacted Super Admin.`,
        url: "/super-admin/audit-logs"
      }))
    });
  }

  redirect(`/portal/support?success=Your+message+has+been+sent+to+Super+Admin.&request=${log.id}`);
}
