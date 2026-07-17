"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const truckerOnboardingSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  equipmentCategoryId: z.coerce.number().int().positive(),
  packageType: z.string().min(2).max(120),
  truckCurrentLocation: z.string().min(2).max(190),
  companyName: z.string().max(190).optional(),
  billingMethod: z.enum(["FIXED", "PERCENTAGE"]),
  ratePercentage: z.coerce.number().min(0).max(100).optional()
}).superRefine((data, context) => {
  if (data.billingMethod === "PERCENTAGE" && (!data.ratePercentage || data.ratePercentage <= 0)) {
    context.addIssue({
      code: "custom",
      path: ["ratePercentage"],
      message: "Enter a rate percentage for percentage billing."
    });
  }
});

const consultantOnboardingSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  specialty: z.string().min(2).max(190),
  workingHours: z.string().min(2).max(190),
  timeZone: z.string().min(2).max(100),
  bio: z.string().min(10).max(2000),
  commissionRate: z.coerce.number().min(0).max(100)
});

export async function completeTruckerOnboardingAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "TRUCKER" || !user.truckerProfile) redirect("/");

  const parsed = truckerOnboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Complete your trucker profile.";
    redirect(`/portal/dashboard?profileError=${encodeURIComponent(message)}`);
  }

  const equipment = await db.equipmentCategory.findFirst({
    where: { id: parsed.data.equipmentCategoryId, isActive: true }
  });
  if (!equipment) redirect("/portal/dashboard?profileError=Select+a+valid+equipment+category.");

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone
      }
    }),
    db.truckerProfile.update({
      where: { id: user.truckerProfile.id },
      data: {
        equipmentCategoryId: equipment.id,
        equipmentType: equipment.name,
        selectedCommissionBps: equipment.commissionBps,
        packageType: parsed.data.packageType,
        truckCurrentLocation: parsed.data.truckCurrentLocation,
        companyName: parsed.data.companyName || null,
        billingMethod: parsed.data.billingMethod,
        ratePercentageBps:
          parsed.data.billingMethod === "PERCENTAGE"
            ? Math.round((parsed.data.ratePercentage || 0) * 100)
            : null,
        profileCompletedAt: new Date(),
        onboardingCompletedAt: new Date()
      }
    })
  ]);

  await audit(user.id, "TRUCKER_ONBOARDING_COMPLETED", "TruckerProfile", user.truckerProfile.id);
  redirect("/portal/dashboard?success=Profile+completed.+Upload+your+mandatory+documents+next.");
}

export async function completeConsultantOnboardingAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const parsed = consultantOnboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Complete your dispatcher profile.";
    redirect(`/onboarding/consultant?error=${encodeURIComponent(message)}`);
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, phone: parsed.data.phone }
    }),
    db.consultantProfile.upsert({
      where: { userId: user.id },
      update: {
        specialty: parsed.data.specialty,
        workingHours: parsed.data.workingHours,
        timeZone: parsed.data.timeZone,
        bio: parsed.data.bio,
        commissionRateBps: Math.round(parsed.data.commissionRate * 100),
        profileCompletedAt: new Date()
      },
      create: {
        userId: user.id,
        specialty: parsed.data.specialty,
        workingHours: parsed.data.workingHours,
        timeZone: parsed.data.timeZone,
        bio: parsed.data.bio,
        commissionRateBps: Math.round(parsed.data.commissionRate * 100),
        profileCompletedAt: new Date()
      }
    })
  ]);

  await audit(user.id, "CONSULTANT_PROFILE_COMPLETED", "User", user.id);
  redirect("/consultant/dashboard?success=Dispatcher+profile+completed.");
}


export async function completeConsultantProfilePopupAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const commissionRate = Number(formData.get("commissionRate") || 5);
  const name = String(formData.get("name") || user.name).trim();
  const phone = String(formData.get("phone") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();
  const workingHours = String(formData.get("workingHours") || "").trim();
  const timeZone = String(formData.get("timeZone") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  if (!name || !phone || !specialty || !workingHours || !timeZone || !bio) {
    redirect("/consultant/dashboard?error=Please+complete+all+dispatcher+profile+fields.");
  }

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name, phone } }),
    db.consultantProfile.upsert({
      where: { userId: user.id },
      update: {
        specialty, workingHours, timeZone, bio,
        commissionRateBps: Number.isFinite(commissionRate) ? Math.round(commissionRate * 100) : 500,
        profileCompletedAt: new Date()
      },
      create: {
        userId: user.id, specialty, workingHours, timeZone, bio,
        commissionRateBps: Number.isFinite(commissionRate) ? Math.round(commissionRate * 100) : 500,
        profileCompletedAt: new Date()
      }
    })
  ]);

  await audit(user.id, "CONSULTANT_PROFILE_COMPLETED", "User", user.id);
  revalidatePath("/consultant/dashboard");
  revalidatePath("/consultant/profile");
  redirect("/consultant/dashboard?success=Dispatcher+profile+completed.");
}

export async function updateTruckerProfileAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "TRUCKER" || !user.truckerProfile) redirect("/");

  const billingMethod = String(formData.get("billingMethod") || "FIXED") as "FIXED" | "PERCENTAGE";
  const ratePercentage = Number(formData.get("ratePercentage") || 0);
  const equipmentCategoryId = Number(formData.get("equipmentCategoryId"));
  const equipment = await db.equipmentCategory.findFirst({
    where: { id: equipmentCategoryId, isActive: true }
  });
  if (!equipment) redirect("/portal/profile?error=Select+a+valid+equipment+category.");

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        name: String(formData.get("name") || user.name).trim(),
        phone: String(formData.get("phone") || "").trim() || null
      }
    }),
    db.truckerProfile.update({
      where: { id: user.truckerProfile.id },
      data: {
        companyName: String(formData.get("companyName") || "").trim() || null,
        mcDot: String(formData.get("mcDot") || "").trim() || null,
        equipmentCategoryId: equipment.id,
        equipmentType: equipment.name,
        selectedCommissionBps: equipment.commissionBps,
        packageType: String(formData.get("packageType") || "").trim() || null,
        truckCurrentLocation: String(formData.get("truckCurrentLocation") || "").trim() || null,
        availability: String(formData.get("availability") || "").trim() || null,
        preferredLanes: String(formData.get("preferredLanes") || "").trim() || null,
        avoidedLanes: String(formData.get("avoidedLanes") || "").trim() || null,
        factoringCompany: String(formData.get("factoringCompany") || "").trim() || null,
        insuranceStatus: String(formData.get("insuranceStatus") || "").trim() || null,
        billingMethod: billingMethod === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        ratePercentageBps: billingMethod === "PERCENTAGE" && Number.isFinite(ratePercentage) ? Math.round(ratePercentage * 100) : null,
        profileCompletedAt: new Date()
      }
    })
  ]);

  revalidatePath("/portal/profile");
  revalidatePath("/portal/dashboard");
  redirect("/portal/profile?success=Profile+updated.");
}

export async function updateConsultantProfileAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const commissionRate = Number(formData.get("commissionRate") || 0);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        name: String(formData.get("name") || user.name).trim(),
        phone: String(formData.get("phone") || "").trim() || null
      }
    }),
    db.consultantProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: String(formData.get("bio") || "").trim() || null,
        specialty: String(formData.get("specialty") || "").trim() || null,
        workingHours: String(formData.get("workingHours") || "").trim() || null,
        timeZone: String(formData.get("timeZone") || "").trim() || null,
        commissionRateBps: Number.isFinite(commissionRate) ? Math.round(commissionRate * 100) : 500,
        profileCompletedAt: new Date()
      },
      create: {
        userId: user.id,
        bio: String(formData.get("bio") || "").trim() || null,
        specialty: String(formData.get("specialty") || "").trim() || null,
        workingHours: String(formData.get("workingHours") || "").trim() || null,
        timeZone: String(formData.get("timeZone") || "").trim() || null,
        commissionRateBps: Number.isFinite(commissionRate) ? Math.round(commissionRate * 100) : 500,
        profileCompletedAt: new Date()
      }
    })
  ]);

  revalidatePath("/consultant/profile");
  redirect("/consultant/profile?success=Profile+updated.");
}
