import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flash } from "@/components/flash";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { date, dateTime, money } from "@/lib/utils";
import { dateRange, effectiveInvoiceDueDate, invoiceIsOverdue, PAGE_SIZE, positivePage } from "@/lib/portal-filters";

export default async function TruckerPayments({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string; view?: string; page?: string; from?: string; to?: string }>;
}) {
  const user = await requireRole("TRUCKER");
  const query = await searchParams;
  const view = query.view === "history" ? "history" : "due";
  const page = positivePage(query.page);

  const dueDateFilter = dateRange(query.from, query.to, "invoiceDate");
  const historyDateFilter = dateRange(query.from, query.to, "paidAt");

  const [dueTotal, dueInvoices, historyTotal, payments, hasSuccessfulPayment] = await Promise.all([
    db.invoice.count({
      where: {
        truckerId: user.truckerProfile!.id,
        status: { in: ["SENT", "VIEWED", "UNPAID", "OVERDUE"] },
        ...dueDateFilter
      }
    }),
    db.invoice.findMany({
      where: {
        truckerId: user.truckerProfile!.id,
        status: { in: ["SENT", "VIEWED", "UNPAID", "OVERDUE"] },
        ...dueDateFilter
      },
      orderBy: { createdAt: "desc" },
      skip: view === "due" ? (page - 1) * PAGE_SIZE : 0,
      take: view === "due" ? PAGE_SIZE : 1
    }),
    db.payment.count({
      where: { truckerId: user.truckerProfile!.id, ...historyDateFilter }
    }),
    db.payment.findMany({
      where: { truckerId: user.truckerProfile!.id, ...historyDateFilter },
      include: { invoice: { include: { agreement: true } } },
      orderBy: { createdAt: "desc" },
      skip: view === "history" ? (page - 1) * PAGE_SIZE : 0,
      take: view === "history" ? PAGE_SIZE : 1
    }),
    db.payment.findFirst({
      where: { truckerId: user.truckerProfile!.id, status: "SUCCEEDED" },
      select: { id: true }
    })
  ]);

  const total = view === "history" ? historyTotal : dueTotal;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="page-header"><div><h1>Payments</h1><p>Due invoices and payment history are kept separate.</p></div></div>
      <Flash success={query.success} error={query.error} />

      <div className="tabs" style={{ marginBottom: 18 }}>
        <Link className={`tab ${view === "due" ? "active" : ""}`} href="/portal/payments?view=due">Due Invoices <span>{dueTotal}</span></Link>
        <Link className={`tab ${view === "history" ? "active" : ""}`} href="/portal/payments?view=history">Payment History <span>{historyTotal}</span></Link>
      </div>

      <div className="card">
        <form className="toolbar" method="GET">
          <input type="hidden" name="view" value={view} />
          <div className="field-inline"><label>From</label><input name="from" type="date" defaultValue={query.from} /></div>
          <div className="field-inline"><label>To</label><input name="to" type="date" defaultValue={query.to} /></div>
          <button className="btn btn-secondary">Filter</button>
          <Link className="btn btn-secondary" href={`/portal/payments?view=${view}`}>Reset</Link>
        </form>

        {view === "history" ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Receipt</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Status</th><th>Paid</th><th>Action</th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td><strong>{payment.receiptNumber || "Pending"}</strong></td>
                    <td>{payment.invoice.invoiceNumber}</td>
                    <td>{money(payment.amountCents)}</td>
                    <td>{payment.paymentMethod || "—"}</td>
                    <td><StatusBadge value={payment.status} /></td>
                    <td>{dateTime(payment.paidAt)}</td>
                    <td className="actions">
                      <a className="btn btn-secondary btn-sm" href={`/print/receipt/${payment.id}`}>Receipt</a>
                      {payment.invoice.agreement ? (
                        <a className="btn btn-secondary btn-sm" href={`/print/agreement/${payment.invoice.agreement.id}`}>Agreement</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!payments.length ? <tr><td colSpan={7}><div className="empty">No payment history found.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Summary</th><th>Amount</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {dueInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.invoiceNumber}</strong></td>
                    <td>{invoice.description}</td>
                    <td>{money(invoice.amountCents)}</td>
                    <td>{date(effectiveInvoiceDueDate(invoice))}{invoice.isFirstInvoice ? <div className="text-small text-muted">First-month grace</div> : null}</td>
                    <td><StatusBadge value={invoiceIsOverdue(invoice) ? "OVERDUE" : invoice.status} /></td>
                    <td className="actions">
                      <Link className="btn btn-secondary btn-sm" href={`/print/invoice/${invoice.id}`}>View Invoice</Link>
                      <Link className="btn btn-primary btn-sm" href={`/portal/invoices/${invoice.id}/pay`}>
                        {hasSuccessfulPayment ? "Pay Invoice" : "Acknowledge & Pay"}
                      </Link>
                    </td>
                  </tr>
                ))}
                {!dueInvoices.length ? <tr><td colSpan={6}><div className="empty">No due invoices.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          pathname="/portal/payments"
          searchParams={{ view, from: query.from, to: query.to }}
        />
      </div>
    </>
  );
}
