import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ALLOWED_DOCUMENT_EXTENSIONS, MAX_DOCUMENT_BYTES } from "@/lib/constants";

const mimeMap: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"]
};

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function magicValid(ext: string, bytes: Uint8Array) {
  if (ext === "pdf") return String.fromCharCode(...bytes.slice(0, 4)) === "%PDF";
  if (["jpg", "jpeg"].includes(ext)) return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === "png") return bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG";
  if (ext === "webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (ext === "doc") return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (ext === "docx") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return false;
}

export async function saveDocumentFile(file: File, folder: string) {
  const ext = extension(file.name);
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext as never)) {
    throw new Error("Only PDF, Word and image files are allowed.");
  }
  if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File must be between 1 byte and 10MB.");
  }
  const allowedMimes = mimeMap[ext] || [];
  if (file.type && !allowedMimes.includes(file.type)) {
    throw new Error("File MIME type does not match an allowed document format.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!magicValid(ext, buffer.subarray(0, 16))) {
    throw new Error("File content does not match its extension.");
  }

  const relative = path.join(folder, `${randomUUID()}.${ext}`).replaceAll("\\", "/");
  const absolute = path.join(process.cwd(), "uploads", relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);

  return {
    storagePath: relative,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size
  };
}

export async function deleteStoredFile(storagePath?: string | null) {
  if (!storagePath) return;
  await unlink(path.join(process.cwd(), "uploads", storagePath)).catch(() => undefined);
}

export async function storedFile(storagePath: string) {
  return readFile(path.join(process.cwd(), "uploads", storagePath));
}
