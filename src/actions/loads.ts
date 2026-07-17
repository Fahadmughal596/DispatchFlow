"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { saveDocumentFile } from "@/lib/files";
import { normalizeLoadStatus } from "@/lib/portal-filters";

export async function createLoadAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const truckerId = Number(formData.get("truckerId"));
  const pickupLocation = String(formData.get("pickupLocation") || "").trim();
  const deliveryLocation = String(formData.get("deliveryLocation") || "").trim();
  const rate = Number(formData.get("rate"));
  const broker = String(formData.get("broker") || "").trim();
  const status = normalizeLoadStatus(String(formData.get("status") || "BOOKED"));
  const notes = String(formData.get("notes") || "").trim();
  const pickupAt = String(formData.get("pickupAt") || "");
  const deliveryAt = String(formData.get("deliveryAt") || "");

  if (!truckerId || !pickupLocation || !deliveryLocation || !Number.isFinite(rate) || rate <= 0 || !status) {
    redirect("/consultant/loads?error=Complete+all+required+load+fields.");
  }

  const trucker = await db.truckerProfile.findFirst({
    where: {
      id: truckerId,
      assignedConsultantId: user.id,
      accountStatus: "ACTIVE"
    }
  });
  if (!trucker) {
    redirect("/consultant/loads?error=Loads+can+only+be+created+for+assigned+active+truckers.");
  }

  const load = await db.load.create({
    data: {
      truckerId,
      consultantId: user.id,
      loadRef: `LOAD-${randomUUID().slice(0, 8).toUpperCase()}`,
      pickupLocation,
      deliveryLocation,
      pickupAt: pickupAt ? new Date(pickupAt) : null,
      deliveryAt: deliveryAt ? new Date(deliveryAt) : null,
      rateCents: Math.round(rate * 100),
      broker: broker || null,
      status,
      notes: notes || null
    }
  });

  await db.notification.create({
    data: {
      userId: trucker.userId,
      title: "New load entry",
      message: `${load.loadRef} was added to your portal.`,
      url: "/portal/loads"
    }
  });

  await audit(user.id, "LOAD_CREATED", "Load", load.id);
  revalidatePath("/consultant/loads");
  revalidatePath("/portal/loads");
  redirect("/consultant/loads?success=Load+entry+created.");
}

export async function updateLoadStatusAction(formData: FormData) {
  const user = await requireUser();
  const loadId = Number(formData.get("loadId"));
  const status = normalizeLoadStatus(String(formData.get("status") || ""));
  if (!status) return;

  const load = await db.load.findUnique({
    where: { id: loadId },
    include: { trucker: true }
  });
  if (!load) return;
  if (user.role === "CONSULTANT_DISPATCHER" && load.consultantId !== user.id) return;
  if (user.role !== "CONSULTANT_DISPATCHER" && user.role !== "SUPER_ADMIN") return;

  await db.$transaction([
    db.load.update({ where: { id: loadId }, data: { status } }),
    db.notification.create({
      data: {
        userId: load.trucker.userId,
        title: "Load status updated",
        message: `${load.loadRef} is now ${status.replaceAll("_", " ")}.`,
        url: "/portal/loads"
      }
    })
  ]);

  await audit(user.id, "LOAD_STATUS_UPDATED", "Load", loadId, null, { status });
  revalidatePath("/consultant/loads");
  revalidatePath("/super-admin/loads");
  revalidatePath("/portal/loads");
}

export async function uploadLoadDocumentAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const loadId = Number(formData.get("loadId"));
  const type = String(formData.get("type") || "").trim();
  const file = formData.get("file");

  const load = await db.load.findFirst({
    where: { id: loadId, consultantId: user.id },
    include: { trucker: true }
  });
  if (!load || !type || !(file instanceof File)) {
    redirect("/consultant/loads?error=Choose+a+load,+document+type+and+file.");
  }

  try {
    const saved = await saveDocumentFile(file, `load-documents/${load.id}`);
    const document = await db.loadDocument.create({
      data: {
        loadId: load.id,
        type,
        originalName: saved.originalName,
        storagePath: saved.storagePath,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        uploadedById: user.id
      }
    });

    await db.notification.create({
      data: {
        userId: load.trucker.userId,
        title: "Load document uploaded",
        message: `${type} was added to ${load.loadRef}.`,
        url: "/portal/loads"
      }
    });
    await audit(user.id, "LOAD_DOCUMENT_UPLOADED", "LoadDocument", document.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Load document upload failed.";
    redirect(`/consultant/loads?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/consultant/loads");
  revalidatePath("/portal/loads");
  redirect("/consultant/loads?success=Load+document+uploaded.");
}
