"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { REQUIRED_DOCUMENTS } from "@/lib/constants";
import { ensureRequiredDocumentRequests } from "@/lib/required-documents";
import { deleteStoredFile, saveDocumentFile } from "@/lib/files";
import { audit } from "@/lib/audit";

const baseMetadata = {
  documentNumber: z.string().max(190).optional(),
  issuingAuthority: z.string().max(190).optional(),
  issueDate: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().max(3000).optional()
};

const requiredMetadataSchema = z.object({ type: z.enum(REQUIRED_DOCUMENTS), ...baseMetadata });
const otherMetadataSchema = z.object({
  documentTitle: z.string().trim().min(2).max(190),
  ...baseMetadata
});

function optionalDate(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

async function upsertRequiredDocument(userId: number, truckerId: number, raw: Record<string, unknown>, file: File) {
  const parsed = requiredMetadataSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Select a valid required document type.");
  await ensureRequiredDocumentRequests(truckerId, userId);
  const request = await db.documentRequest.findUnique({ where: { truckerId_type: { truckerId, type: parsed.data.type } } });
  if (!request) throw new Error("Required document request was not found.");
  const existing = await db.document.findUnique({ where: { documentRequestId: request.id } });
  const saved = await saveDocumentFile(file, `trucker-documents/${truckerId}`);
  try {
    const isMcPermit = parsed.data.type === "MC Permit";
    const isCoi = parsed.data.type === "Certificate of Insurance (COI)";
    const isDriverLicense =
      parsed.data.type === "Driver's License";

    const values = {
      truckerId,
      documentRequestId: request.id,
      type: parsed.data.type,
      documentTitle: parsed.data.type,
      documentNumber: isCoi
        ? parsed.data.documentNumber || null
        : null,
      issuingAuthority: null,
      issueDate: isDriverLicense
        ? optionalDate(parsed.data.issueDate)
        : null,
      expiresAt: isDriverLicense
        ? optionalDate(parsed.data.expiresAt)
        : null,
      notes: null,
      originalName: saved.originalName,
      storagePath: saved.storagePath,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      status: DocumentStatus.UPLOADED,
      uploadedById: userId,
      reviewedById: null,
      reviewNotes: null
    };
    const document = existing
      ? await db.document.update({ where: { id: existing.id }, data: values })
      : await db.document.create({ data: values });
    await db.documentRequest.update({ where: { id: request.id }, data: { status: "UPLOADED" } });
    if (existing) await deleteStoredFile(existing.storagePath);
    return document;
  } catch (error) {
    await deleteStoredFile(saved.storagePath);
    throw error;
  }
}

async function createOtherDocument(userId: number, truckerId: number, raw: Record<string, unknown>, file: File) {
  const parsed = otherMetadataSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Enter a valid document title.");
  const saved = await saveDocumentFile(file, `trucker-documents/${truckerId}/other`);
  try {
    return await db.document.create({
      data: {
        truckerId,
        documentRequestId: null,
        type: "OTHER",
        documentTitle: parsed.data.documentTitle,
        documentNumber: parsed.data.documentNumber || null,
        issuingAuthority: parsed.data.issuingAuthority || null,
        issueDate: optionalDate(parsed.data.issueDate),
        expiresAt: optionalDate(parsed.data.expiresAt),
        notes: parsed.data.notes || null,
        originalName: saved.originalName,
        storagePath: saved.storagePath,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        status: DocumentStatus.UPLOADED,
        uploadedById: userId
      }
    });
  } catch (error) {
    await deleteStoredFile(saved.storagePath);
    throw error;
  }
}

async function notifyDocumentUpload(userId: number, trucker: { id: number; userId: number; assignedConsultantId: number | null; user: { name: string } }, document: { id: number; type: string; documentTitle: string | null }, uploadedByDispatcher: boolean) {
  const title = document.documentTitle || document.type;
  if (uploadedByDispatcher) {
    await db.notification.create({ data: { userId: trucker.userId, title: "Document added by your Dispatcher", message: `${title} was added to your profile.`, url: "/portal/documents" } });
  } else {
    const recipients = [trucker.assignedConsultantId, ...(await db.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true } })).map((x) => x.id)].filter((id): id is number => Boolean(id));
    if (recipients.length) await db.notification.createMany({ data: recipients.map((id) => ({ userId: id, title: "Trucker document uploaded", message: `${trucker.user.name} uploaded ${title}.`, url: id === trucker.assignedConsultantId ? "/consultant/documents" : "/super-admin/documents" })) });
  }
  await audit(userId, uploadedByDispatcher ? "DOCUMENT_UPLOADED_FOR_TRUCKER" : "DOCUMENT_UPLOADED", "Document", document.id);
}

export async function truckerUploadDocumentAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "TRUCKER" || !user.truckerProfile) redirect("/");
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/portal/documents?error=Choose+a+file.");
  try {
    const document = await upsertRequiredDocument(user.id, user.truckerProfile.id, Object.fromEntries(formData), file);
    await notifyDocumentUpload(user.id, { ...user.truckerProfile, user: { name: user.name } }, document, false);
  } catch (error) {
    redirect(`/portal/documents?error=${encodeURIComponent(error instanceof Error ? error.message : "Document upload failed.")}`);
  }
  revalidatePath("/portal/documents");
  redirect("/portal/documents?success=Required+document+uploaded.");
}

export async function truckerUploadOtherDocumentAction(
  formData: FormData
) {
  const user = await requireUser();

  if (user.role !== "TRUCKER" || !user.truckerProfile) {
    redirect("/");
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/portal/documents?error=Choose+a+file.");
  }

  try {
    const document = await createOtherDocument(
      user.id,
      user.truckerProfile.id,
      Object.fromEntries(formData),
      file
    );

    await notifyDocumentUpload(
      user.id,
      {
        ...user.truckerProfile,
        user: { name: user.name }
      },
      document,
      false
    );
  } catch (error) {
    redirect(
      `/portal/documents?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Document upload failed."
      )}`
    );
  }

  revalidatePath("/portal/documents");

  redirect(
    "/portal/documents?page=1&success=Document+uploaded."
  );
}

export async function truckerUpdateOtherDocumentAction(
  formData: FormData
) {
  const user = await requireUser();

  if (user.role !== "TRUCKER" || !user.truckerProfile) {
    redirect("/");
  }

  const documentId = Number(formData.get("documentId"));

  if (!Number.isInteger(documentId) || documentId <= 0) {
    redirect("/portal/documents?error=Invalid+document.");
  }

  const parsed = otherMetadataSchema.safeParse(
    Object.fromEntries(formData)
  );

  if (!parsed.success) {
    redirect(
      "/portal/documents?error=Enter+valid+document+details."
    );
  }

  const existing = await db.document.findFirst({
    where: {
      id: documentId,
      truckerId: user.truckerProfile.id,
      documentRequestId: null
    }
  });

  if (!existing) {
    redirect("/portal/documents?error=Document+not+found.");
  }

  const submittedFile = formData.get("file");

  const replacementFile =
    submittedFile instanceof File && submittedFile.size > 0
      ? submittedFile
      : null;

  let saved:
    | Awaited<ReturnType<typeof saveDocumentFile>>
    | null = null;

  try {
    if (replacementFile) {
      saved = await saveDocumentFile(
        replacementFile,
        `trucker-documents/${user.truckerProfile.id}/other`
      );
    }

    await db.document.update({
      where: { id: existing.id },
      data: {
        documentTitle: parsed.data.documentTitle,
        documentNumber:
          parsed.data.documentNumber || null,
        issuingAuthority:
          parsed.data.issuingAuthority || null,
        expiresAt: optionalDate(parsed.data.expiresAt),
        notes: parsed.data.notes || null,
        ...(saved
          ? {
              originalName: saved.originalName,
              storagePath: saved.storagePath,
              mimeType: saved.mimeType,
              sizeBytes: saved.sizeBytes,
              status: DocumentStatus.UPLOADED,
              reviewedById: null,
              reviewNotes: null
            }
          : {})
      }
    });

    if (saved) {
      await deleteStoredFile(existing.storagePath);
    }

    await audit(
      user.id,
      "DOCUMENT_UPDATED",
      "Document",
      existing.id
    );
  } catch (error) {
    if (saved) {
      await deleteStoredFile(saved.storagePath);
    }

    redirect(
      `/portal/documents?error=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Document update failed."
      )}`
    );
  }

  revalidatePath("/portal/documents");

  redirect(
    "/portal/documents?page=1&success=Document+updated."
  );
}

export async function reviewDocumentAction(formData: FormData) {
  const user = await requireUser();
  if (!["CONSULTANT_DISPATCHER", "SUPER_ADMIN"].includes(user.role)) redirect("/");
  const documentId = Number(formData.get("documentId"));
  const status = String(formData.get("status")) as DocumentStatus;
  const reviewNotes = String(formData.get("reviewNotes") || "").slice(0, 2000);
  if (!["APPROVED", "REJECTED", "REPLACEMENT_REQUESTED"].includes(status)) return;
  const document = await db.document.findUnique({ where: { id: documentId }, include: { trucker: { include: { user: true } }, request: true } });
  if (!document || (user.role === "CONSULTANT_DISPATCHER" && document.trucker.assignedConsultantId !== user.id)) return;
  await db.$transaction([
    db.document.update({ where: { id: document.id }, data: { status, reviewedById: user.id, reviewNotes } }),
    ...(document.request ? [db.documentRequest.update({ where: { id: document.request.id }, data: { status } })] : []),
    db.notification.create({ data: { userId: document.trucker.userId, title: "Document review updated", message: `${document.documentTitle || document.type} is now ${status.replaceAll("_", " ")}.`, url: "/portal/documents" } })
  ]);
  await audit(user.id, "DOCUMENT_REVIEWED", "Document", document.id, null, { status });
  revalidatePath("/consultant/documents");
  revalidatePath("/super-admin/documents");
  revalidatePath("/portal/documents");
  redirect("/portal/documents?page=1&success=Document+uploaded.");
}

