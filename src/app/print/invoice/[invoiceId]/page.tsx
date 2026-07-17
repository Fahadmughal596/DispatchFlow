import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrintDocument } from "@/components/print-document";
import { date, money } from "@/lib/utils";

export default async function PrintInvoice({
  params
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const user = await requireUser();
  const { invoiceId } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id: Number(invoiceId) },
    include: {
      trucker: { include: { user: true } },
      consultant: true,
      items: true
    }
  });
  if (!invoice) notFound();

  const allowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "TRUCKER" && invoice.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && invoice.consultantId === user.id);
  if (!allowed) notFound();

  return (
    <PrintDocument title="Invoice" subtitle={invoice.invoiceNumber}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div><strong>Bill to</strong><p>{invoice.trucker.user.name}<br />{invoice.trucker.companyName || ""}<br />{invoice.trucker.user.email}</p></div>
        <div><strong>Consultant / Dispatcher</strong><p>{invoice.consultant.name}<br />Invoice date: {date(invoice.invoiceDate)}<br />Due: {date(invoice.dueDate)}</p></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Quantity</th><th>Unit</th><th>Total</th></tr></thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitCents)}</td><td>{money(item.totalCents)}</td></tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ textAlign: "right", marginTop: 24 }}>Total: {money(invoice.amountCents)}</h2>
      <p>Status: {invoice.status.replaceAll("_", " ")}</p>
    </PrintDocument>
  );
}
