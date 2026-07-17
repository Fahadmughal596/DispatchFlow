import { randomBytes, createHash } from "node:crypto";

export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(cents / 100);
}

export function date(value?: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function dateTime(value?: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function token() {
  return randomBytes(32).toString("hex");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function invoiceNumber(id: number) {
  return `INV-${String(id).padStart(8, "0")}`;
}

export function receiptNumber(id: number) {
  return `RCT-${String(id).padStart(8, "0")}`;
}

export function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|_|\s)\w/g, (m) => m.replace("_", " ").toUpperCase());
}
