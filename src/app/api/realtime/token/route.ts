import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

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

export async function GET() {
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

  try {
    const token = await new SignJWT({
      role: user.role
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
    console.error("[realtime-token]", error);

    return NextResponse.json(
      { error: "Realtime service is not configured." },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
