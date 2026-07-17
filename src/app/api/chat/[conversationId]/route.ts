import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { conversationId } = await context.params;
  const id = Number(conversationId);
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: { trucker: true }
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "TRUCKER" && conversation.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && conversation.consultantId === user.id);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await db.message.findMany({
    where: { conversationId: id },
    include: {
      sender: { select: { name: true } },
      attachments: true
    },
    orderBy: { sentAt: "asc" }
  });

  return NextResponse.json(
    messages.map((message) => ({
      id: message.id,
      body: message.body,
      sentAt: message.sentAt.toISOString(),
      senderId: message.senderId,
      senderName: message.sender.name,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        url: `/api/chat-attachments/${attachment.id}`
      }))
    }))
  );
}
