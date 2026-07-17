import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { storedFile } from "@/lib/files";

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const user = await currentUser();
  if (!user) return new Response("Unauthenticated", { status: 401 });

  const { documentId } = await context.params;
  const document = await db.document.findUnique({
    where: { id: Number(documentId) },
    include: { trucker: true }
  });
  if (!document) return new Response("Not found", { status: 404 });

  const allowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "TRUCKER" && document.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && document.trucker.assignedConsultantId === user.id);

  if (!allowed) return new Response("Forbidden", { status: 403 });

  try {
    const buffer = await storedFile(document.storagePath);
    const safeName = document.originalName.replace(/["\r\n]/g, "_");
    return new Response(buffer, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(document.sizeBytes),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
