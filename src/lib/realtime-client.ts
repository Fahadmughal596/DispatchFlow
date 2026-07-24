"use client";

import { io, type Socket } from "socket.io-client";

let activeSocket: Socket | null = null;
let connectionPromise: Promise<Socket | null> | null = null;

type TokenResponse = {
  token?: string;
};

export async function getRealtimeSocket(): Promise<Socket | null> {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  if (!socketUrl) {
    console.warn("[realtime] NEXT_PUBLIC_SOCKET_URL is not configured.");
    return null;
  }

  if (activeSocket) {
    if (!activeSocket.connected) {
      activeSocket.connect();
    }

    return activeSocket;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const response = await fetch("/api/realtime/token", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      console.warn("[realtime] Could not obtain authentication token.");
      return null;
    }

    const payload = (await response.json()) as TokenResponse;

    if (!payload.token) {
      return null;
    }

    activeSocket = io(socketUrl, {
      auth: {
        token: payload.token
      },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    return activeSocket;
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}
