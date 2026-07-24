"use client";

import { useEffect, useState } from "react";
import { getRealtimeSocket } from "@/lib/realtime-client";

type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "unavailable";

export function RealtimeStatus() {
  const [status, setStatus] =
    useState<ConnectionState>("connecting");

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void getRealtimeSocket()
      .then((socket) => {
        if (disposed) return;

        if (!socket) {
          setStatus("unavailable");
          return;
        }

        const handleConnect = () => setStatus("connected");
        const handleDisconnect = () => setStatus("disconnected");
        const handleConnectError = () => setStatus("disconnected");

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);

        setStatus(socket.connected ? "connected" : "connecting");

        cleanup = () => {
          socket.off("connect", handleConnect);
          socket.off("disconnect", handleDisconnect);
          socket.off("connect_error", handleConnectError);
        };
      })
      .catch(() => {
        if (!disposed) {
          setStatus("unavailable");
        }
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const connected = status === "connected";

  return (
    <span
      title={`Realtime: ${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 32,
        padding: "5px 9px",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: 999,
        fontSize: 12,
        whiteSpace: "nowrap"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "#22c55e" : "#f59e0b"
        }}
      />
      {connected ? "Live" : "Connecting"}
    </span>
  );
}
