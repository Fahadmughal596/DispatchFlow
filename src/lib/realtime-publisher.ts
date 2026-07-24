type RealtimeAttachment = {
  id: number;
  kind: "IMAGE" | "DOCUMENT";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

type RealtimeMessage = {
  id: number;
  body: string;
  sentAt: string;
  senderId: number;
  senderName: string;
  attachments: RealtimeAttachment[];
};

export async function publishRealtimeMessage(
  conversationId: number,
  message: RealtimeMessage
) {
  const serverUrl = process.env.REALTIME_SERVER_URL
    ?.trim()
    .replace(/\/$/, "");

  const internalSecret =
    process.env.REALTIME_INTERNAL_SECRET?.trim();

  if (!serverUrl || !internalSecret) {
    console.warn(
      "[realtime-publish] Realtime server is not configured."
    );

    return false;
  }

  try {
    const response = await fetch(
      `${serverUrl}/internal/publish`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-realtime-secret": internalSecret
        },
        body: JSON.stringify({
          conversationId,
          message
        }),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      console.warn(
        `[realtime-publish] Server returned ${response.status}.`
      );
    }

    return response.ok;
  } catch (error) {
    console.warn(
      "[realtime-publish] Delivery failed.",
      error instanceof Error ? error.message : "Unknown error"
    );

    return false;
  }
}
