import { Role } from "@prisma/client";

export const REQUIRED_DOCUMENTS = [
  "MC Permit",
  "Certificate of Insurance (COI)",
  "Driver's License"
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  "pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const CHAT_ATTACHMENT_EXTENSIONS = ALLOWED_DOCUMENT_EXTENSIONS;
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const LOAD_WORKFLOW_STATUSES = [
  "BOOKED",
  "PICKED_UP",
  "DROPPED_OFF",
  "CANCELLED"
] as const;

export const ROLE_HOME: Record<Role, string> = {
  TRUCKER: "/portal/dashboard",
  CONSULTANT_DISPATCHER: "/consultant/dashboard",
  SUPER_ADMIN: "/super-admin/dashboard"
};

export const ROLE_LABEL: Record<Role, string> = {
  TRUCKER: "Trucker",
  CONSULTANT_DISPATCHER: "Consultant / Dispatcher",
  SUPER_ADMIN: "Super Admin"
};
