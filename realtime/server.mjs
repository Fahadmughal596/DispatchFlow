import { createServer } from "node:http";
import { Server } from "socket.io";
import { jwtVerify } from "jose";

const port = Number(process.env.PORT || 4001);

const issuer = "dispatchflow-app";
const audience = "dispatchflow-realtime";

const socketSecretValue = process.env.SOCKET_TOKEN_SECRET?.trim();

if (!socketSecretValue || socketSecretValue.length < 32) {
  console.error(
    "SOCKET_TOKEN_SECRET is missing or contains fewer than 32 characters."
  );
  process.exit(1);
}

const socketSecret = new TextEncoder().encode(socketSecretValue);

const allowedRoles = new Set([
  "TRUCKER",
  "CONSULTANT_DISPATCHER",
  "SUPER_ADMIN"
]);

const allowedOrigins = (
  process.env.SOCKET_ALLOWED_ORIGINS ||
  process.env.APP_URL ||
  "http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store"
    });

    response.end(
      JSON.stringify({
        ok: true,
        service: "dispatchflow-realtime",
        timestamp: new Date().toISOString()
      })
    );

    return;
  }

  response.writeHead(404, {
    "content-type": "application/json"
  });

  response.end(
    JSON.stringify({
      error: "Not found"
    })
  );
});

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, "");

      if (!origin || allowedOrigins.includes(normalizedOrigin || "")) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["polling", "websocket"]
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string" || !token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    const { payload } = await jwtVerify(token, socketSecret, {
      issuer,
      audience
    });

    const userId = Number(payload.sub);
    const role = String(payload.role || "");

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !allowedRoles.has(role)
    ) {
      next(new Error("Unauthorized"));
      return;
    }

    socket.data.user = {
      id: userId,
      role
    };

    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;

  socket.join(`user:${user.id}`);

  console.log(
    `[socket] connected user=${user.id} role=${user.role} socket=${socket.id}`
  );

  socket.emit("server:ready", {
    socketId: socket.id,
    userId: user.id
  });


  socket.on("conversation:join", async (data, acknowledge) => {
    const fail = (message) => {
      if (typeof acknowledge === "function") {
        acknowledge({
          ok: false,
          error: message
        });
      }
    };

    const token =
      typeof data?.token === "string"
        ? data.token
        : "";

    if (!token) {
      fail("Missing conversation token.");
      return;
    }

    try {
      const { payload } = await jwtVerify(
        token,
        socketSecret,
        {
          issuer,
          audience
        }
      );

      const conversationId = Number(
        payload.conversationId
      );

      const tokenUserId = Number(payload.sub);
      const tokenRole = String(payload.role || "");
      const purpose = String(payload.purpose || "");

      if (
        purpose !== "conversation-room" ||
        !Number.isInteger(conversationId) ||
        conversationId <= 0 ||
        tokenUserId !== user.id ||
        tokenRole !== user.role
      ) {
        fail("Unauthorized conversation.");
        return;
      }

      const roomName =
        `conversation:${conversationId}`;

      await socket.join(roomName);

      console.log(
        `[socket] user=${user.id} joined room=${roomName}`
      );

      if (typeof acknowledge === "function") {
        acknowledge({
          ok: true,
          conversationId
        });
      }
    } catch {
      fail(
        "Invalid or expired conversation token."
      );
    }
  });

  socket.on("conversation:leave", async (data, acknowledge) => {
    const conversationId = Number(
      data?.conversationId
    );

    if (
      !Number.isInteger(conversationId) ||
      conversationId <= 0
    ) {
      if (typeof acknowledge === "function") {
        acknowledge({
          ok: false,
          error: "Invalid conversation."
        });
      }

      return;
    }

    await socket.leave(
      `conversation:${conversationId}`
    );

    if (typeof acknowledge === "function") {
      acknowledge({
        ok: true,
        conversationId
      });
    }
  });

  socket.on("client:ping", (acknowledge) => {
    if (typeof acknowledge === "function") {
      acknowledge({
        ok: true,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `[socket] disconnected user=${user.id} socket=${socket.id} reason=${reason}`
    );
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`DispatchFlow realtime server listening on port ${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
