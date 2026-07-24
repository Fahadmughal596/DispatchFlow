import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const issuer = "dispatchflow-app";
const audience = "dispatchflow-realtime";

function signingSecret() {
  const value = process.env.SOCKET_TOKEN_SECRET?.trim();

  if (!value || value.length < 32) {
    throw new Error(
      "SOCKET_TOKEN_SECRET must contain at least 32 characters."
    );
  }

  return new TextEncoder().encode(value);
}

export async function GET(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const requestUrl = new URL(request.url);
  const conversationId = Number(
    requestUrl.searchParams.get("conversationId")
  );

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return NextResponse.json(
      { error: "Invalid conversation." },
      { status: 400 }
    );
  }

  const conversation = await db.conversation.findUnique({
    where: {
      id: conversationId
    },
    include: {
      trucker: true
    }
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 }
    );
  }

  const allowed =
    user.role === "SUPER_ADMIN" ||
    (
      user.role === "TRUCKER" &&
      conversation.trucker.userId === user.id
    ) ||
    (
      user.role === "CONSULTANT_DISPATCHER" &&
      conversation.consultantId === user.id
    );

  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const token = await new SignJWT({
      role: user.role,
      conversationId,
      purpose: "conversation-room"
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT"
      })
      .setSubject(String(user.id))
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(signingSecret());

    return NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("[conversation-token]", error);

    return NextResponse.json(
      { error: "Realtime service is not configured." },
      { status: 503 }
    );
  }
}
