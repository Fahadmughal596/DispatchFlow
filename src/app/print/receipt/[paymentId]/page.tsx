import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrintDocument } from "@/components/print-document";
import { dateTime, money } from "@/lib/utils";

export default async function PrintReceipt({
  params
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const user = await requireUser();
  const { paymentId } = await params;
  const payment = await db.payment.findUnique({
    where: { id: Number(paymentId) },
    include: {
      invoice: { include: { consultant: true } },
      trucker: { include: { user: true } }
    }
  });
  if (!payment) notFound();

  const allowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "TRUCKER" && payment.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && payment.invoice.consultantId === user.id);
  if (!allowed) notFound();

  return (
    <PrintDocument title="Payment Receipt" subtitle={payment.receiptNumber || ""}>
      <table>
        <tbody>
          <tr><th>Trucker</th><td>{payment.trucker.user.name}</td></tr>
          <tr><th>Invoice</th><td>{payment.invoice.invoiceNumber}</td></tr>
          <tr><th>Amount paid</th><td>{money(payment.amountCents)}</td></tr>
          <tr><th>Payment method</th><td>{payment.paymentMethod}</td></tr>
          <tr><th>Transaction ID</th><td>{payment.transactionId}</td></tr>
          <tr><th>Status</th><td>{payment.status}</td></tr>
          <tr><th>Paid at</th><td>{dateTime(payment.paidAt)}</td></tr>
        </tbody>
      </table>
    </PrintDocument>
  );
}
