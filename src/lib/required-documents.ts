import { DocumentStatus, Role, type TruckerProfile } from "@prisma/client";
import { db } from "@/lib/db";
import { REQUIRED_DOCUMENTS } from "@/lib/constants";

const completeStatuses: DocumentStatus[] = ["UPLOADED", "APPROVED"];

export async function ensureRequiredDocumentRequests(truckerId: number, requestedBy?: number) {
  const profile = await db.truckerProfile.findUnique({ where: { id: truckerId } });
  if (!profile) return;

  const requester =
    requestedBy ??
    profile.assignedConsultantId ??
    (await db.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } }))?.id ??
    profile.userId;

  await Promise.all(
    REQUIRED_DOCUMENTS.map((type) =>
      db.documentRequest.upsert({
        where: { truckerId_type: { truckerId, type } },
        update: {},
        create: {
          truckerId,
          requestedBy: requester,
          type,
          instructions: "Mandatory portal document.",
          status: "REQUESTED"
        }
      })
    )
  );
}

export async function documentChecklist(truckerId: number) {
  const documents = await db.document.findMany({
    where: { truckerId, type: { in: [...REQUIRED_DOCUMENTS] } },
    include: { uploader: true, reviewer: true },
    orderBy: { id: "desc" }
  });

  const latest = new Map<string, (typeof documents)[number]>();
  for (const document of documents) {
    if (!latest.has(document.type)) latest.set(document.type, document);
  }

  return REQUIRED_DOCUMENTS.map((type) => {
    const document = latest.get(type) ?? null;
    const expired = Boolean(document?.expiresAt && document.expiresAt < new Date());
    const complete = Boolean(
      document &&
      !expired &&
      completeStatuses.includes(document.status)
    );

    return {
      type,
      document,
      expired,
      complete,
      statusLabel: expired
        ? "Expired"
        : document?.status.replaceAll("_", " ") ?? "Missing"
    };
  });
}

export async function missingDocumentSummary(user: {
  id: number;
  role: Role;
  truckerProfile?: TruckerProfile | null;
}) {
  const profiles =
    user.role === "TRUCKER"
      ? user.truckerProfile
        ? [user.truckerProfile]
        : []
      : await db.truckerProfile.findMany({
          where:
            user.role === "CONSULTANT_DISPATCHER"
              ? { assignedConsultantId: user.id }
              : undefined,
          include: { user: { select: { name: true } } }
        });

  const rows: Array<{ truckerId: number; truckerName: string; missing: string[] }> = [];

  for (const profile of profiles) {
    await ensureRequiredDocumentRequests(profile.id);
    const checklist = await documentChecklist(profile.id);
    const missing = checklist.filter((item) => !item.complete).map((item) => item.type);
    if (!missing.length) continue;

    const truckerUser = await db.user.findUnique({
      where: { id: profile.userId },
      select: { name: true }
    });

    rows.push({
      truckerId: profile.id,
      truckerName: truckerUser?.name ?? "Trucker",
      missing
    });
  }

  const missingCount = rows.reduce((sum, row) => sum + row.missing.length, 0);
  const url =
    user.role === "TRUCKER"
      ? "/portal/documents"
      : user.role === "CONSULTANT_DISPATCHER"
        ? "/consultant/documents"
        : "/super-admin/documents";

  return {
    rows,
    missingCount,
    affectedTruckers: rows.length,
    url,
    message:
      user.role === "TRUCKER"
        ? rows.length
          ? `Mandatory documents missing: ${rows[0].missing.join(", ")}`
          : "All mandatory documents are present."
        : missingCount
          ? `${missingCount} mandatory document slot(s) are missing across ${rows.length} trucker(s).`
          : "All mandatory documents are present."
  };
}
