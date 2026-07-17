"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveDocumentFile } from "@/lib/files";
import { validateContactMade } from "@/lib/lead-status";
import { audit } from "@/lib/audit";

export async function sendMessageAction(formData: FormData) {
  const user = await requireUser();
  const conversationId = Number(formData.get("conversationId"));
  const body = String(formData.get("body") || "").trim();
  const attachment = formData.get("attachment");
  const hasAttachment = attachment instanceof File && attachment.size > 0;

  if (!Number.isInteger(conversationId) || body.length > 5000 || (!body && !hasAttachment)) return;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { trucker: true }
  });
  if (!conversation) return;

  const allowed =
    (user.role === "TRUCKER" && conversation.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && conversation.consultantId === user.id);
  if (!allowed) return;

  let savedAttachment:
    | { storagePath: string; originalName: string; mimeType: string; sizeBytes: number }
    | null = null;

  if (hasAttachment) {
    savedAttachment = await saveDocumentFile(
      attachment,
      `chat-attachments/${conversationId}`
    );
  }

  const message = await db.message.create({
    data: {
      conversationId,
      senderId: user.id,
      body,
      attachments: savedAttachment
        ? {
            create: {
              uploadedById: user.id,
              kind: savedAttachment.mimeType.startsWith("image/") ? "IMAGE" : "DOCUMENT",
              originalName: savedAttachment.originalName,
              storagePath: savedAttachment.storagePath,
              mimeType: savedAttachment.mimeType,
              sizeBytes: savedAttachment.sizeBytes
            }
          }
        : undefined
    }
  });

  await db.$transaction([
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    }),
    db.notification.create({
      data: {
        userId: user.role === "TRUCKER" ? conversation.consultantId : conversation.trucker.userId,
        title: hasAttachment ? "New chat attachment" : "New portal message",
        message: `${user.name}: ${body ? body.slice(0, 100) : savedAttachment?.originalName}`,
        url: user.role === "TRUCKER" ? "/consultant/chat" : "/portal/chat"
      }
    })
  ]);

  await validateContactMade(conversationId, user.id);
  await audit(user.id, hasAttachment ? "CHAT_ATTACHMENT_SENT" : "CHAT_MESSAGE_SENT", "Message", message.id);
  revalidatePath(user.role === "TRUCKER" ? "/portal/chat" : "/consultant/chat");
}
