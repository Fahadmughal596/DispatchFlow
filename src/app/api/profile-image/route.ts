import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { storedFile } from "@/lib/files";

function contentType(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const path = request.nextUrl.searchParams.get("path");

  if (
    !path ||
    user.role !== "TRUCKER" ||
    user.truckerProfile?.profileImagePath !== path
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await storedFile(path);
  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType(path),
      "Cache-Control": "private, max-age=300"
    }
  });
}
