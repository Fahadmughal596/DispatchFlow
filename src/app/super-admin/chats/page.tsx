import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatPanel } from "@/components/chat-panel";
import { dateTime } from "@/lib/utils";

export default async function AdminChatsPage({
  searchParams
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const admin = await requireRole("SUPER_ADMIN");
  const query = await searchParams;
  const conversations = await db.conversation.findMany({
    include: {
      trucker: { include: { user: true } },
      consultant: true,
      messages: {
        include: { sender: true, attachments: true },
        orderBy: { sentAt: "asc" }
      }
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }]
  });
  const selected =
    conversations.find((conversation) => conversation.id === Number(query.conversation)) ||
    conversations[0];

  return (
    <>
      <div className="page-header"><div><h1>Chat Audit</h1><p>Read-only support and audit access to all portal conversations.</p></div></div>
      <div className="chat-layout">
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <Link
              className={`conversation-link ${selected?.id === conversation.id ? "active" : ""}`}
              href={`/super-admin/chats?conversation=${conversation.id}`}
              key={conversation.id}
            >
              <div className="avatar">{conversation.trucker.user.name.slice(0, 1)}</div>
              <div>
                <strong>{conversation.trucker.user.name}</strong>
                <span style={{ display: "block" }}>with {conversation.consultant.name}</span>
                <span style={{ display: "block" }}>{dateTime(conversation.lastMessageAt)}</span>
              </div>
            </Link>
          ))}
        </div>
        {selected ? (
          <ChatPanel
            conversationId={selected.id}
            currentUserId={admin.id}
            otherName={`${selected.trucker.user.name} ↔ ${selected.consultant.name}`}
            readOnly
            initialMessages={selected.messages.map((message) => ({
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
            }))}
          />
        ) : <div className="empty">No conversations.</div>}
      </div>
    </>
  );
}
