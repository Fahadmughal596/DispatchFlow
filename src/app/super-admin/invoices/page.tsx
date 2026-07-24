import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { approveInvoiceAction } from "@/actions/invoices";
import { StatusBadge } from "@/components/status-badge";
import { date, money } from "@/lib/utils";

export default async function AdminInvoicesPage() {
  await requireRole("SUPER_ADMIN");
  const invoices = await db.invoice.findMany({
    include: {
      trucker: { include: { user: true } },
      consultant: true,
      payment: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>Invoices</h1><p>Approve, send and monitor all portal invoices.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Trucker</th><th>Consultant</th><th>Amount</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoiceNumber}</strong><div className="text-small text-muted">{invoice.description}</div></td>
                  <td>{invoice.trucker.user.name}</td>
                  <td>{invoice.consultant.name}</td>
                  <td>{money(invoice.amountCents)}</td>
                  <td>{date(invoice.dueDate)}</td>
                  <td><StatusBadge value={invoice.status} /></td>
                  <td className="actions">
                    {["DRAFT", "PENDING_APPROVAL"].includes(invoice.status) ? (
                      <form action={approveInvoiceAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button className="btn btn-primary btn-sm">Approve & Send</button>
                      </form>
                    ) : null}
                    <a className="btn btn-secondary btn-sm" href={`/print/invoice/${invoice.id}`}>Print</a>
                  </td>
                </tr>
              ))}
              {!invoices.length ? <tr><td colSpan={7}><div className="empty">No invoices.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
