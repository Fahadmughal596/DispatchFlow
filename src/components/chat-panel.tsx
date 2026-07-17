"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessageAction } from "@/actions/chat";

type ChatAttachment = {
  id: number;
  kind: "IMAGE" | "DOCUMENT";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

type ChatMessage = {
  id: number;
  body: string;
  sentAt: string;
  senderId: number;
  senderName: string;
  attachments: ChatAttachment[];
};

export function ChatPanel({
  conversationId,
  currentUserId,
  initialMessages,
  otherName,
  readOnly = false
}: {
  conversationId: number;
  currentUserId: number;
  initialMessages: ChatMessage[];
  otherName: string;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroll = () => {
      if (box.current) box.current.scrollTop = box.current.scrollHeight;
    };
    scroll();

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/chat/${conversationId}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as ChatMessage[];
      setMessages(next);
      window.setTimeout(scroll, 30);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [conversationId]);

  return (
    <div className="chat-box">
      <div className="chat-head">
        <div>
          <strong>{otherName}</strong>
          <div className="text-small text-muted">Chat with picture and document attachments</div>
        </div>
        {readOnly ? <span className="badge badge-orange">Audit only</span> : null}
      </div>

      <div className="messages" ref={box}>
        {messages.map((message) => (
          <div className={`message-row ${message.senderId === currentUserId ? "mine" : ""}`} key={message.id}>
            <div className="message-bubble">
              {message.body ? <div>{message.body}</div> : null}
              {message.attachments.map((attachment) => (
                <div className="chat-attachment" key={attachment.id}>
                  {attachment.kind === "IMAGE" ? (
                    <a href={attachment.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={attachment.url} alt={attachment.originalName} />
                    </a>
                  ) : null}
                  <a className="attachment-link" href={attachment.url} target="_blank" rel="noreferrer">
                    {attachment.originalName}
                  </a>
                </div>
              ))}
              <div className="message-meta">
                {message.senderName} · {new Date(message.sentAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {!messages.length ? <div className="empty">No messages yet.</div> : null}
      </div>

      {!readOnly ? (
        <form
          className="chat-form chat-form-attachment"
          action={async (formData) => {
            setSending(true);
            try {
              await sendMessageAction(formData);
              const form = document.getElementById(`chat-form-${conversationId}`) as HTMLFormElement | null;
              form?.reset();
            } finally {
              setSending(false);
            }
          }}
          id={`chat-form-${conversationId}`}
         
        >
          <input type="hidden" name="conversationId" value={conversationId} />
          <textarea name="body" placeholder="Write a message..." maxLength={5000} />
          <label className="attachment-picker">
            Attach
            <input name="attachment" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" />
          </label>
          <button className="btn btn-primary" disabled={sending}>{sending ? "Sending..." : "Send"}</button>
        </form>
      ) : null}
    </div>
  );
}
