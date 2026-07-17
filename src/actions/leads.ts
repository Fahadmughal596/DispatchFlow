"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function updateLeadNotesAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const truckerId = Number(formData.get("truckerId"));
  const profile = await db.truckerProfile.findFirst({
    where: { id: truckerId, assignedConsultantId: user.id }
  });
  if (!profile) return;

  await db.truckerProfile.update({
    where: { id: truckerId },
    data: {
      companyName: String(formData.get("companyName") || "").trim() || null,
      mcDot: String(formData.get("mcDot") || "").trim() || null,
      equipmentType: String(formData.get("equipmentType") || "").trim() || null,
      truckCurrentLocation: String(formData.get("truckCurrentLocation") || "").trim() || null,
      availability: String(formData.get("availability") || "").trim() || null,
      preferredLanes: String(formData.get("preferredLanes") || "").trim() || null,
      avoidedLanes: String(formData.get("avoidedLanes") || "").trim() || null,
      factoringCompany: String(formData.get("factoringCompany") || "").trim() || null,
      insuranceStatus: String(formData.get("insuranceStatus") || "").trim() || null,
      mainProblem: String(formData.get("mainProblem") || "").trim() || null
    }
  });

  await audit(user.id, "LEAD_INTERNAL_NOTES_UPDATED", "TruckerProfile", truckerId);
  revalidatePath("/consultant/leads");
}
