import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { storedFile } from "@/lib/files";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { attachmentId } = await context.params;
  const attachment = await db.messageAttachment.findUnique({
    where: { id: Number(attachmentId) },
    include: {
      message: {
        include: { conversation: { include: { trucker: true } } }
      }
    }
  });

  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const conversation = attachment.message.conversation;
  const allowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "TRUCKER" && conversation.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && conversation.consultantId === user.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await storedFile(attachment.storagePath).catch(() => null);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  return new NextResponse(file, {
    headers: {
      "content-type": attachment.mimeType,
      "content-disposition": `inline; filename="${attachment.originalName.replaceAll('"', '')}"`,
      "cache-control": "private, no-store"
    }
  });
}
