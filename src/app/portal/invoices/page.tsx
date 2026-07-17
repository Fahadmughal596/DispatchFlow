import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flash } from "@/components/flash";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { date, money } from "@/lib/utils";
import { dateRange, effectiveInvoiceDueDate, invoiceIsOverdue, PAGE_SIZE, positivePage } from "@/lib/portal-filters";

export default async function TruckerInvoices({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string; page?: string; from?: string; to?: string }>;
}) {
  const user = await requireRole("TRUCKER");
  const params = await searchParams;
  const page = positivePage(params.page);
  const where = {
    truckerId: user.truckerProfile!.id,
    ...dateRange(params.from, params.to, "invoiceDate")
  };

  const [total, invoices, totals, previousPayment] = await Promise.all([
    db.invoice.count({ where }),
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { truckerId: user.truckerProfile!.id },
      _sum: { amountCents: true },
      _count: true
    }),
    db.payment.findFirst({ where: { truckerId: user.truckerProfile!.id, status: "SUCCEEDED" } })
  ]);

  const totalDue = totals
    .filter((row) => ["SENT", "VIEWED", "UNPAID", "OVERDUE"].includes(row.status))
    .reduce((sum, row) => sum + (row._sum.amountCents || 0), 0);
  const totalPaid = totals
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum + (row._sum.amountCents || 0), 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstPaymentPending = !previousPayment;

  return (
    <>
      <div className="page-header">
        <div><h1>Invoices</h1><p>Invoice summary, printable invoices and payment actions.</p></div>
      </div>
      <Flash success={params.success} error={params.error} />

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card stat-card"><div className="stat-label">Total due</div><div className="stat-value">{money(totalDue)}</div></div>
        <div className="card stat-card"><div className="stat-label">Total paid</div><div className="stat-value">{money(totalPaid)}</div></div>
        <div className="card stat-card"><div className="stat-label">Invoice count</div><div className="stat-value">{totals.reduce((sum, row) => sum + row._count, 0)}</div></div>
      </div>

      <div className="card">
        <form className="toolbar" method="GET">
          <div className="field-inline"><label>From</label><input name="from" type="date" defaultValue={params.from} /></div>
          <div className="field-inline"><label>To</label><input name="to" type="date" defaultValue={params.to} /></div>
          <button className="btn btn-secondary" type="submit">Filter</button>
          <Link className="btn btn-secondary" href="/portal/invoices">Reset</Link>
        </form>

        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Invoice Summary</th><th>Amount</th><th>Effective Due</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => {
                const overdue = invoiceIsOverdue(invoice);
                return (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.invoiceNumber}</strong><div className="text-small text-muted">{date(invoice.invoiceDate)}</div></td>
                    <td>{invoice.description}<div className="text-small text-muted">{invoice.notes || "No extra notes"}</div></td>
                    <td>{money(invoice.amountCents)}</td>
                    <td>
                      {date(effectiveInvoiceDueDate(invoice))}
                      {invoice.isFirstInvoice ? <div className="text-small text-muted">First-month grace applied</div> : null}
                    </td>
                    <td><StatusBadge value={overdue ? "OVERDUE" : invoice.status} /></td>
                    <td className="actions">
                      <Link className="btn btn-secondary btn-sm" href={`/print/invoice/${invoice.id}`}>View Invoice</Link>
                      {["SENT", "VIEWED", "UNPAID"].includes(invoice.status) ? (
                        <Link className="btn btn-primary btn-sm" href={`/portal/invoices/${invoice.id}/pay`}>
                          {firstPaymentPending ? "Acknowledge & Pay" : "Pay Invoice"}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!invoices.length ? <tr><td colSpan={6}><div className="empty">No invoices found.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          pathname="/portal/invoices"
          searchParams={{ from: params.from, to: params.to }}
        />
      </div>
    </>
  );
}
