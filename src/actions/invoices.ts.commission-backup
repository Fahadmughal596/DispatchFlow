"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { documentChecklist } from "@/lib/required-documents";
import { invoiceNumber, receiptNumber } from "@/lib/utils";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function createInvoiceAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "CONSULTANT_DISPATCHER") redirect("/");

  const truckerId = Number(formData.get("truckerId"));
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!Number.isInteger(truckerId) || !Number.isFinite(amount) || amount <= 0 || !description) {
    redirect("/consultant/invoices?error=Complete+all+required+invoice+fields.");
  }

  const trucker = await db.truckerProfile.findFirst({
    where: { id: truckerId, assignedConsultantId: user.id },
    include: { lead: true }
  });
  if (!trucker) redirect("/consultant/invoices?error=Assigned+trucker+not+found.");

  const existingInvoiceCount = await db.invoice.count({ where: { truckerId } });
  const isFirstInvoice = existingInvoiceCount === 0;
  const createdAt = new Date();
  const amountCents = Math.round(amount * 100);

  const invoice = await db.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber: `TEMP-${randomUUID()}`,
        truckerId,
        consultantId: user.id,
        amountCents,
        description,
        notes: notes || null,
        dueDate: dueDateRaw ? new Date(`${dueDateRaw}T23:59:59`) : null,
        isFirstInvoice,
        agingStartsAt: isFirstInvoice ? addMonths(createdAt, 1) : null,
        status: "PENDING_APPROVAL",
        items: {
          create: {
            description,
            quantity: 1,
            unitCents: amountCents,
            totalCents: amountCents
          }
        }
      }
    });

    if (trucker.lead) {
      await tx.lead.update({
        where: { id: trucker.lead.id },
        data: { currentStatus: "PENDING_INVOICE" }
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: trucker.lead.id,
          status: "PENDING_INVOICE",
          changedBy: user.id,
          note: "Invoice submitted and pending approval."
        }
      });
    }

    return created;
  });

  await db.invoice.update({
    where: { id: invoice.id },
    data: { invoiceNumber: invoiceNumber(invoice.id) }
  });

  const admins = await db.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  if (admins.length) {
    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Invoice awaiting approval",
        message: `${user.name} submitted ${invoiceNumber(invoice.id)} for approval.`,
        url: "/super-admin/invoices"
      }))
    });
  }

  await audit(user.id, "INVOICE_DRAFT_CREATED", "Invoice", invoice.id);
  revalidatePath("/consultant/invoices");
  redirect("/consultant/invoices?success=Invoice+submitted+for+Super+Admin+approval.");
}

export async function approveInvoiceAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/");

  const invoiceId = Number(formData.get("invoiceId"));
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { trucker: { include: { user: true, lead: true } } }
  });
  if (!invoice || !["DRAFT", "PENDING_APPROVAL"].includes(invoice.status)) return;

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", sentAt: new Date() }
    });
    if (invoice.trucker.lead) {
      await tx.lead.update({
        where: { id: invoice.trucker.lead.id },
        data: { currentStatus: "INVOICE_SENT" }
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: invoice.trucker.lead.id,
          status: "INVOICE_SENT",
          changedBy: user.id,
          note: `${invoice.invoiceNumber} approved and sent.`
        }
      });
    }
    await tx.notification.create({
      data: {
        userId: invoice.trucker.userId,
        title: "Invoice ready",
        message: `${invoice.invoiceNumber} is ready in your portal.`,
        url: `/portal/invoices/${invoice.id}/pay`
      }
    });
  });

  await audit(user.id, "INVOICE_APPROVED_AND_SENT", "Invoice", invoice.id);
  revalidatePath("/super-admin/invoices");
  revalidatePath("/portal/invoices");
  revalidatePath("/portal/payments");
}

export async function payInvoiceAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "TRUCKER" || !user.truckerProfile) redirect("/");

  const invoiceId = Number(formData.get("invoiceId"));
  const signerName = String(formData.get("signerName") || "").trim();
  const accept = formData.get("accept");

  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      truckerId: user.truckerProfile.id,
      status: { in: ["SENT", "VIEWED", "UNPAID"] }
    },
    include: {
      agreement: true,
      consultant: { include: { consultantProfile: true } },
      trucker: { include: { lead: true } }
    }
  });
  if (!invoice) redirect("/portal/payments?view=due&error=Invoice+not+available+for+payment.");

  const checklist = await documentChecklist(user.truckerProfile.id);
  const missing = checklist.filter((item) => !item.complete).map((item) => item.type);
  if (missing.length) {
    redirect(`/portal/documents?error=${encodeURIComponent(`Upload mandatory documents before payment: ${missing.join(", ")}`)}`);
  }

  const firstPayment = !(await db.payment.findFirst({
    where: { truckerId: user.truckerProfile.id, status: "SUCCEEDED" }
  }));

  if (firstPayment && (!signerName || accept !== "on")) {
    redirect(`/portal/invoices/${invoice.id}/pay?error=Acknowledge+the+agreement+before+payment.`);
  }

  const processorFeeCents = Math.round(invoice.amountCents * 0.029) + 30;
  const commissionBps = invoice.consultant.consultantProfile?.commissionRateBps ?? 500;
  const dispatcherCommissionCents = Math.round(invoice.amountCents * commissionBps / 10000);
  const companyNetCents = invoice.amountCents - processorFeeCents - dispatcherCommissionCents;

  await db.$transaction(async (tx) => {
    if (firstPayment && !invoice.agreement) {
      await tx.agreement.create({
        data: {
          truckerId: user.truckerProfile!.id,
          invoiceId: invoice.id,
          signerName,
          acceptanceCode: `AGR-${randomUUID()}`
        }
      });

      if (invoice.trucker.lead) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: invoice.trucker.lead.id,
            status: "CONTRACT_MADE",
            changedBy: user.id,
            note: "Agreement acknowledged during first payment."
          }
        });
      }
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        truckerId: user.truckerProfile!.id,
        amountCents: invoice.amountCents,
        processorFeeCents,
        dispatcherCommissionCents,
        companyNetCents,
        paymentMethod: "DEMO_GATEWAY",
        transactionId: `demo_${randomUUID()}`,
        status: "SUCCEEDED",
        paidAt: new Date()
      }
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { receiptNumber: receiptNumber(payment.id) }
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() }
    });

    await tx.truckerProfile.update({
      where: { id: user.truckerProfile!.id },
      data: { accountStatus: "ACTIVE", activatedAt: new Date() }
    });

    if (invoice.trucker.lead) {
      await tx.lead.update({
        where: { id: invoice.trucker.lead.id },
        data: { currentStatus: "INVOICE_PAID" }
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: invoice.trucker.lead.id,
          status: "INVOICE_PAID",
          changedBy: user.id,
          note: "Payment confirmed and account activated."
        }
      });
    }

    await tx.notification.createMany({
      data: [
        {
          userId: invoice.consultantId,
          title: "Payment received",
          message: `${invoice.invoiceNumber} has been paid.`,
          url: "/consultant/payments"
        },
        ...(await tx.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true } })).map((admin) => ({
          userId: admin.id,
          title: "Payment received",
          message: `${invoice.invoiceNumber} has been paid.`,
          url: "/super-admin/payments"
        }))
      ]
    });
  });

  await audit(user.id, "PAYMENT_COMPLETED", "Invoice", invoice.id);
  revalidatePath("/portal/invoices");
  revalidatePath("/portal/payments");
  revalidatePath("/portal/dashboard");
  redirect("/portal/payments?view=history&success=Payment+completed+and+receipt+generated.");
}
