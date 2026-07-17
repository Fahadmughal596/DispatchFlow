import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInvoiceAction } from "@/actions/invoices";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { date, money } from "@/lib/utils";

export default async function ConsultantInvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const [truckers, invoices] = await Promise.all([
    db.truckerProfile.findMany({
      where: { assignedConsultantId: user.id },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    }),
    db.invoice.findMany({
      where: { consultantId: user.id },
      include: { trucker: { include: { user: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <>
      <div className="page-header"><div><h1>Invoices</h1><p>Create drafts for assigned truckers and track admin approval and payment.</p></div></div>
      <Flash success={query.success} error={query.error} />

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title"><div><h2>Create Invoice Draft</h2><p>Submitted to Super Admin for approval.</p></div></div>
          <form action={createInvoiceAction}>
            <div className="field">
              <label>Assigned trucker</label>
              <select name="truckerId" required>
                <option value="">Select trucker</option>
                {truckers.map((trucker) => (
                  <option value={trucker.id} key={trucker.id}>{trucker.user.name} {trucker.companyName ? `— ${trucker.companyName}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Description</label><input name="description" required /></div>
            <div className="form-grid">
              <div className="field"><label>Amount (USD)</label><input name="amount" type="number" min="1" step="0.01" required /></div>
              <div className="field"><label>Due date</label><input name="dueDate" type="date" /></div>
            </div>
            <div className="field"><label>Notes</label><textarea name="notes" /></div>
            <button className="btn btn-primary">Submit Invoice Draft</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title"><div><h2>Invoice History</h2><p>Your assigned trucker invoices.</p></div></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Trucker</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.invoiceNumber}</strong></td>
                    <td>{invoice.trucker.user.name}</td>
                    <td>{money(invoice.amountCents)}</td>
                    <td>{date(invoice.dueDate)}</td>
                    <td><StatusBadge value={invoice.status} /></td>
                  </tr>
                ))}
                {!invoices.length ? <tr><td colSpan={5}><div className="empty">No invoices.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
