import { del, get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_BYTES
} from "@/lib/constants";

const mimeMap: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream"
  ],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"]
};

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function magicValid(ext: string, bytes: Uint8Array) {
  if (ext === "pdf") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "%PDF";
  }

  if (["jpg", "jpeg"].includes(ext)) {
    return (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (ext === "png") {
    return (
      bytes[0] === 0x89 &&
      String.fromCharCode(...bytes.slice(1, 4)) === "PNG"
    );
  }

  if (ext === "webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  if (ext === "doc") {
    return (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0
    );
  }

  if (ext === "docx") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  return false;
}

function normalizeFolder(folder: string) {
  return folder
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
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
    throw new Error(
      "File MIME type does not match an allowed document format."
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!magicValid(ext, buffer.subarray(0, 16))) {
    throw new Error("File content does not match its extension.");
  }

  const safeFolder = normalizeFolder(folder);
  const storagePath = `${safeFolder}/${randomUUID()}.${ext}`;

  const blob = await put(storagePath, buffer, {
    access: "private",
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: false
  });

  return {
    storagePath: blob.pathname,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size
  };
}

export async function deleteStoredFile(
  storagePath?: string | null
) {
  if (!storagePath) return;

  try {
    await del(storagePath);
  } catch (error) {
    console.error("Failed to delete stored file:", error);
  }
}

export async function storedFile(storagePath: string) {
  const result = await get(storagePath, {
    access: "private"
  });

  if (!result || result.statusCode !== 200) {
    throw new Error("Stored file was not found.");
  }

  const arrayBuffer = await new Response(
    result.stream
  ).arrayBuffer();

  return Buffer.from(arrayBuffer);
}

const PROFILE_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export async function saveProfileImage(file: File, folder: string) {
  const ext = extension(file.name);

  if (!PROFILE_IMAGE_EXTENSIONS.includes(ext as (typeof PROFILE_IMAGE_EXTENSIONS)[number])) {
    throw new Error("Profile picture must be JPG, PNG or WEBP.");
  }

  if (file.size <= 0 || file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile picture must be smaller than 5MB.");
  }

  const allowedMimes = mimeMap[ext] || [];
  if (file.type && !allowedMimes.includes(file.type)) {
    throw new Error("Profile picture format is invalid.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!magicValid(ext, buffer.subarray(0, 16))) {
    throw new Error("Profile picture content does not match its extension.");
  }

  const safeFolder = normalizeFolder(folder);
  const storagePath = `${safeFolder}/${randomUUID()}.${ext}`;
  const blob = await put(storagePath, buffer, {
    access: "private",
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: false
  });

  return blob.pathname;
}
