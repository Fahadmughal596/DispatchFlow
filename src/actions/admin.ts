"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { reassignLead } from "@/lib/assignment";
import { ensureRequiredDocumentRequests } from "@/lib/required-documents";

export async function createDispatcherAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();
  const serviceDuration = String(formData.get("serviceDuration") || "").trim();
  const initialLoadCount = Number(formData.get("initialLoadCount") || 0);
  const pastRevenue = Number(formData.get("pastRevenue") || 0);
  const password = String(formData.get("password") || "");
  if (!name || !email.includes("@") || password.length < 8) {
    redirect("/super-admin/consultants?error=Enter+valid+dispatcher+details.");
  }
  if (await db.user.findUnique({ where: { email } })) {
    redirect("/super-admin/consultants?error=Email+already+exists.");
  }

  const user = await db.user.create({
    data: {
      role: "CONSULTANT_DISPATCHER",
      name,
      email,
      phone: phone || null,
      passwordHash: await bcrypt.hash(password, 12),
      consultantProfile: {
        create: {
          phone: phone || null,
          specialty: specialty || null,
          serviceDuration: serviceDuration || null,
          initialLoadCount: Number.isFinite(initialLoadCount) ? Math.max(0, Math.round(initialLoadCount)) : 0,
          pastRevenueCents: Number.isFinite(pastRevenue) ? Math.max(0, Math.round(pastRevenue * 100)) : 0
        }
      }
    }
  });

  await audit(admin.id, "DISPATCHER_CREATED", "User", user.id);
  revalidatePath("/super-admin/consultants");
  redirect("/super-admin/consultants?success=Consultant+/+Dispatcher+created.");
}

export async function toggleDispatcherPauseAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const userId = Number(formData.get("userId"));
  const profile = await db.consultantProfile.findUnique({ where: { userId } });
  if (!profile) return;

  await db.consultantProfile.update({
    where: { userId },
    data: { isPaused: !profile.isPaused }
  });
  await audit(admin.id, "DISPATCHER_PAUSE_TOGGLED", "User", userId, { isPaused: profile.isPaused }, { isPaused: !profile.isPaused });
  revalidatePath("/super-admin/consultants");
}

export async function reassignLeadAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const leadId = Number(formData.get("leadId"));
  const consultantId = Number(formData.get("consultantId"));
  const reason = String(formData.get("reason") || "").trim();
  await reassignLead(leadId, consultantId, admin.id, reason);
  revalidatePath("/super-admin/leads");
}

export async function syncRequiredDocumentsAction() {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const truckers = await db.truckerProfile.findMany({ select: { id: true } });
  for (const trucker of truckers) {
    await ensureRequiredDocumentRequests(trucker.id, admin.id);
  }
  revalidatePath("/super-admin/documents");
}

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const t2fUrl = String(formData.get("t2fUrl") || "").trim();
  const invoiceApproval = formData.get("invoiceApproval") === "on" ? "1" : "0";

  await db.$transaction([
    db.appSetting.upsert({
      where: { key: "t2f_url" },
      update: { value: t2fUrl },
      create: { key: "t2f_url", value: t2fUrl }
    }),
    db.appSetting.upsert({
      where: { key: "invoice_approval" },
      update: { value: invoiceApproval },
      create: { key: "invoice_approval", value: invoiceApproval }
    })
  ]);
  await audit(admin.id, "SETTINGS_UPDATED", "AppSetting");
  redirect("/super-admin/settings?success=Settings+saved.");
}

export async function createEquipmentCategoryAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const commission = Number(formData.get("commission") || 0);
  const displayOrder = Number(formData.get("displayOrder") || 0);
  if (!name || !Number.isFinite(commission) || commission < 0 || commission > 100) {
    redirect("/super-admin/settings?error=Enter+a+valid+equipment+name+and+commission.");
  }

  await db.equipmentCategory.create({
    data: {
      name,
      description: description || null,
      commissionBps: Math.round(commission * 100),
      displayOrder: Number.isFinite(displayOrder) ? Math.round(displayOrder) : 0
    }
  });
  await audit(admin.id, "EQUIPMENT_CATEGORY_CREATED", "EquipmentCategory", undefined, undefined, { name, commission });
  revalidatePath("/super-admin/settings");
  redirect("/super-admin/settings?success=Equipment+category+created.");
}

export async function updateEquipmentCategoryAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const commission = Number(formData.get("commission") || 0);
  const displayOrder = Number(formData.get("displayOrder") || 0);
  const isActive = formData.get("isActive") === "on";
  if (!id || !name || !Number.isFinite(commission) || commission < 0 || commission > 100) return;

  const previous = await db.equipmentCategory.findUnique({ where: { id } });
  await db.equipmentCategory.update({
    where: { id },
    data: {
      name,
      description: description || null,
      commissionBps: Math.round(commission * 100),
      displayOrder: Number.isFinite(displayOrder) ? Math.round(displayOrder) : 0,
      isActive
    }
  });
  await audit(admin.id, "EQUIPMENT_CATEGORY_UPDATED", "EquipmentCategory", id, previous, { name, commission, isActive });
  revalidatePath("/super-admin/settings");
  revalidatePath("/portal/profile");
}

export async function deleteEquipmentCategoryAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");
  const id = Number(formData.get("id"));
  if (!id) return;

  const category = await db.equipmentCategory.findUnique({ where: { id }, include: { _count: { select: { truckers: true } } } });
  if (!category) return;
  if (category._count.truckers > 0) {
    redirect("/super-admin/settings?error=This+equipment+is+already+used.+Deactivate+it+instead+of+deleting.");
  }
  await db.equipmentCategory.delete({ where: { id } });
  await audit(admin.id, "EQUIPMENT_CATEGORY_DELETED", "EquipmentCategory", id, category, undefined);
  revalidatePath("/super-admin/settings");
  redirect("/super-admin/settings?success=Equipment+category+deleted.");
}

export async function updateDispatcherControlsAction(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") redirect("/");
  const userId = Number(formData.get("userId"));
  const priorityWeight = Number(formData.get("priorityWeight") || 1);
  const maxLeadCap = Number(formData.get("maxLeadCap") || 100);
  const commissionRate = Number(formData.get("commissionRate") || 5);
  const phone = String(formData.get("phone") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();
  const serviceDuration = String(formData.get("serviceDuration") || "").trim();
  const initialLoadCount = Number(formData.get("initialLoadCount") || 0);
  const pastRevenue = Number(formData.get("pastRevenue") || 0);
  const status = String(formData.get("status") || "ACTIVE");
  if (!userId) return;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        status: status as "ACTIVE" | "PAUSED" | "DISABLED",
        phone: phone || null
      }
    }),
    db.consultantProfile.update({
      where: { userId },
      data: {
        priorityWeight: Math.max(1, Math.round(priorityWeight)),
        maxLeadCap: Math.max(0, Math.round(maxLeadCap)),
        phone: phone || null,
        specialty: specialty || null,
        serviceDuration: serviceDuration || null,
        initialLoadCount: Number.isFinite(initialLoadCount) ? Math.max(0, Math.round(initialLoadCount)) : 0,
        pastRevenueCents: Number.isFinite(pastRevenue) ? Math.max(0, Math.round(pastRevenue * 100)) : 0,
        commissionRateBps: Math.max(0, Math.min(10000, Math.round(commissionRate * 100))),
        isPaused: status !== "ACTIVE"
      }
    })
  ]);
  await audit(admin.id, "DISPATCHER_CONTROLS_UPDATED", "User", userId);
  revalidatePath("/super-admin/consultants");
}
