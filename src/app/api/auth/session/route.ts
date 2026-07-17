import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await currentUser();

  return NextResponse.json(
    user
      ? { authenticated: true, role: user.role }
      : { authenticated: false },
    {
      status: user ? 200 : 401,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  );
}
