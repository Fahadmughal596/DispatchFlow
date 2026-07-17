import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { dateTime, money } from "@/lib/utils";

export default async function ConsultantPaymentsPage() {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const payments = await db.payment.findMany({
    where: { invoice: { consultantId: user.id } },
    include: {
      invoice: true,
      trucker: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>Payments</h1><p>Payment summary for your assigned truckers.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Transaction</th><th>Trucker</th><th>Invoice</th><th>Amount</th><th>Commission</th><th>Status</th><th>Paid</th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.transactionId}</strong></td>
                  <td>{payment.trucker.user.name}</td>
                  <td>{payment.invoice.invoiceNumber}</td>
                  <td>{money(payment.amountCents)}</td>
                  <td>{money(payment.dispatcherCommissionCents)}</td>
                  <td><StatusBadge value={payment.status} /></td>
                  <td>{dateTime(payment.paidAt)}</td>
                </tr>
              ))}
              {!payments.length ? <tr><td colSpan={7}><div className="empty">No successful payments yet.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
