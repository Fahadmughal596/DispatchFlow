import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { dateTime, money } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  await requireRole("SUPER_ADMIN");
  const payments = await db.payment.findMany({
    include: {
      invoice: { include: { consultant: true } },
      trucker: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>Payments & Revenue</h1><p>Processor fee, dispatcher commission and company net reporting.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Transaction</th><th>Trucker</th><th>Consultant</th><th>Paid</th><th>Processor fee</th><th>Commission</th><th>Company net</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.transactionId}</strong><div className="text-small text-muted">{payment.receiptNumber || "No receipt"}</div></td>
                  <td>{payment.trucker.user.name}</td>
                  <td>{payment.invoice.consultant.name}</td>
                  <td>{money(payment.amountCents)}</td>
                  <td>{money(payment.processorFeeCents)}</td>
                  <td>{money(payment.dispatcherCommissionCents)}</td>
                  <td>{money(payment.companyNetCents)}</td>
                  <td><StatusBadge value={payment.status} /></td>
                  <td>{dateTime(payment.paidAt)}</td>
                </tr>
              ))}
              {!payments.length ? <tr><td colSpan={9}><div className="empty">No payments.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
