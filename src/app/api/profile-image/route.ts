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

  const allowed =
    Boolean(path) &&
    (
      user.role === "SUPER_ADMIN" ||
      user.truckerProfile?.profileImagePath === path
    );

  if (!path || !allowed) {
    return new NextResponse("Not found", {
      status: 404
    });
  }

  try {
    const file = await storedFile(path);

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType(path),
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch {
    return new NextResponse("Not found", {
      status: 404
    });
  }
}
