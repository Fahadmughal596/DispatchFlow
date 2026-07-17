import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatPanel } from "@/components/chat-panel";

export default async function TruckerChatPage() {
  const user = await requireRole("TRUCKER");
  const conversation = await db.conversation.findFirst({
    where: { trucker: { userId: user.id } },
    include: {
      consultant: true,
      messages: {
        include: { sender: true, attachments: true },
        orderBy: { sentAt: "asc" }
      }
    }
  });

  return (
    <>
      <div className="page-header">
        <div><h1>Portal Chat</h1><p>Primary text communication with your assigned Consultant / Dispatcher.</p></div>
      </div>
      {conversation ? (
        <div className="chat-layout" style={{ gridTemplateColumns: "1fr" }}>
          <ChatPanel
            conversationId={conversation.id}
            currentUserId={user.id}
            otherName={conversation.consultant.name}
            initialMessages={conversation.messages.map((m) => ({
              id: m.id,
              body: m.body,
              sentAt: m.sentAt.toISOString(),
              senderId: m.senderId,
              senderName: m.sender.name,
              attachments: m.attachments.map((attachment) => ({
                id: attachment.id,
                kind: attachment.kind,
                originalName: attachment.originalName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                url: `/api/chat-attachments/${attachment.id}`
              }))
            }))}
          />
        </div>
      ) : <div className="empty">Your chat will appear after a Consultant / Dispatcher is assigned.</div>}
    </>
  );
}
