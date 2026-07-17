import { db } from "@/lib/db";

export async function validateContactMade(conversationId: number, changedBy: number) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      trucker: { include: { lead: true } },
      messages: { select: { senderId: true } }
    }
  });

  if (!conversation || conversation.twoSidedContactValidated || !conversation.trucker.lead) return;

  const truckerUserId = conversation.trucker.userId;
  const hasTrucker = conversation.messages.some((m) => m.senderId === truckerUserId);
  const hasConsultant = conversation.messages.some((m) => m.senderId === conversation.consultantId);

  if (!hasTrucker || !hasConsultant) return;

  await db.$transaction([
    db.conversation.update({
      where: { id: conversation.id },
      data: { twoSidedContactValidated: true }
    }),
    db.lead.update({
      where: { id: conversation.trucker.lead.id },
      data: { currentStatus: "CONTACT_MADE" }
    }),
    db.leadStatusHistory.create({
      data: {
        leadId: conversation.trucker.lead.id,
        status: "CONTACT_MADE",
        changedBy,
        note: "System validated after both sides sent a portal message."
      }
    })
  ]);
}
