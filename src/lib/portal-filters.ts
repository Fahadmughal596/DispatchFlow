import type { Invoice, LoadStatus, Prisma } from "@prisma/client";

export const PAGE_SIZE = 10;

export function positivePage(value?: string) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function dateRange(from?: string, to?: string, field = "createdAt") {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00`);
  if (to) range.lte = new Date(`${to}T23:59:59.999`);
  return Object.keys(range).length ? { [field]: range } : {};
}

export function loadTabWhere(tab: string): Prisma.LoadWhereInput {
  const now = new Date();

  if (tab === "scheduled") {
    return {
      status: { in: ["BOOKED", "ASSIGNED", "OFFERED"] },
      pickupAt: { gte: now }
    };
  }

  if (tab === "completed") {
    return { status: { in: ["DROPPED_OFF", "DELIVERED", "COMPLETED"] } };
  }

  if (tab === "previous") {
    return {
      OR: [
        { status: "CANCELLED" },
        { deliveryAt: { lt: now } }
      ]
    };
  }

  return { status: { in: ["PICKED_UP", "IN_TRANSIT"] } };
}

export function effectiveInvoiceDueDate(invoice: Pick<Invoice, "dueDate" | "agingStartsAt" | "isFirstInvoice">) {
  if (invoice.isFirstInvoice && invoice.agingStartsAt) return invoice.agingStartsAt;
  return invoice.dueDate;
}

export function invoiceIsOverdue(invoice: Pick<Invoice, "status" | "dueDate" | "agingStartsAt" | "isFirstInvoice">) {
  if (["PAID", "CANCELLED", "REFUNDED"].includes(invoice.status)) return false;
  const effective = effectiveInvoiceDueDate(invoice);
  return Boolean(effective && effective < new Date());
}

export function normalizeLoadStatus(value: string): LoadStatus | null {
  const allowed: LoadStatus[] = ["BOOKED", "PICKED_UP", "DROPPED_OFF", "CANCELLED"];
  return allowed.includes(value as LoadStatus) ? (value as LoadStatus) : null;
}
