import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flash } from "@/components/flash";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { date, dateTime, money } from "@/lib/utils";
import {
  dateRange,
  effectiveInvoiceDueDate,
  invoiceIsOverdue,
  PAGE_SIZE,
  positivePage
} from "@/lib/portal-filters";

type InvoiceQuery = {
  success?: string;
  error?: string;
  view?: string;
  page?: string;
  from?: string;
  to?: string;
};

export default async function TruckerInvoices({
  searchParams
}: {
  searchParams: Promise<InvoiceQuery>;
}) {
  const user = await requireRole("TRUCKER");
  const query = await searchParams;

  const view =
    query.view === "history"
      ? "history"
      : query.view === "all"
        ? "all"
        : "due";

  const page = positivePage(query.page);
  const truckerId = user.truckerProfile!.id;

  const invoiceDateFilter = dateRange(
    query.from,
    query.to,
    "invoiceDate"
  );

  const paymentDateFilter = dateRange(
    query.from,
    query.to,
    "paidAt"
  );

  const dueStatuses = ["SENT", "VIEWED", "UNPAID", "OVERDUE"] as const;

  const [
    invoiceTotals,
    dueCount,
    allInvoiceCount,
    paymentCount,
    dueInvoices,
    allInvoices,
    payments,
    successfulPayment
  ] = await Promise.all([
    db.invoice.groupBy({
      by: ["status"],
      where: { truckerId },
      _sum: { amountCents: true },
      _count: true
    }),

    db.invoice.count({
      where: {
        truckerId,
        status: { in: [...dueStatuses] },
        ...invoiceDateFilter
      }
    }),

    db.invoice.count({
      where: {
        truckerId,
        ...invoiceDateFilter
      }
    }),

    db.payment.count({
      where: {
        truckerId,
        ...paymentDateFilter
      }
    }),

    db.invoice.findMany({
      where: {
        truckerId,
        status: { in: [...dueStatuses] },
        ...invoiceDateFilter
      },
      orderBy: { createdAt: "desc" },
      skip: view === "due" ? (page - 1) * PAGE_SIZE : 0,
      take: view === "due" ? PAGE_SIZE : 1
    }),

    db.invoice.findMany({
      where: {
        truckerId,
        ...invoiceDateFilter
      },
      orderBy: { createdAt: "desc" },
      skip: view === "all" ? (page - 1) * PAGE_SIZE : 0,
      take: view === "all" ? PAGE_SIZE : 1
    }),

    db.payment.findMany({
      where: {
        truckerId,
        ...paymentDateFilter
      },
      include: {
        invoice: {
          include: {
            agreement: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: view === "history" ? (page - 1) * PAGE_SIZE : 0,
      take: view === "history" ? PAGE_SIZE : 1
    }),

    db.payment.findFirst({
      where: {
        truckerId,
        status: "SUCCEEDED"
      },
      select: {
        id: true
      }
    })
  ]);

  const totalDue = invoiceTotals
    .filter((row) =>
      dueStatuses.includes(
        row.status as (typeof dueStatuses)[number]
      )
    )
    .reduce(
      (sum, row) => sum + (row._sum.amountCents || 0),
      0
    );

  const totalPaid = invoiceTotals
    .filter((row) => row.status === "PAID")
    .reduce(
      (sum, row) => sum + (row._sum.amountCents || 0),
      0
    );

  const invoiceCount = invoiceTotals.reduce(
    (sum, row) => sum + row._count,
    0
  );

  const total =
    view === "history"
      ? paymentCount
      : view === "all"
        ? allInvoiceCount
        : dueCount;

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const firstPaymentPending = !successfulPayment;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>
            Review due invoices, all billing records, payments,
            receipts and agreements from one place.
          </p>
        </div>
      </div>

      <Flash success={query.success} error={query.error} />

      <section
        className="grid grid-3 invoice-summary-grid"
        style={{ marginBottom: 18 }}
      >
        <article className="card stat-card">
          <div className="stat-label">Total due</div>
          <div className="stat-value">{money(totalDue)}</div>
        </article>

        <article className="card stat-card">
          <div className="stat-label">Total paid</div>
          <div className="stat-value">{money(totalPaid)}</div>
        </article>

        <article className="card stat-card">
          <div className="stat-label">Invoice count</div>
          <div className="stat-value">{invoiceCount}</div>
        </article>
      </section>

      <nav
        className="tabs invoice-portal-tabs"
        aria-label="Invoice sections"
      >
        <Link
          className={`tab ${view === "due" ? "active" : ""}`}
          href="/portal/invoices?view=due"
        >
          Due Invoices
          <span>{dueCount}</span>
        </Link>

        <Link
          className={`tab ${view === "all" ? "active" : ""}`}
          href="/portal/invoices?view=all"
        >
          All Invoices
          <span>{allInvoiceCount}</span>
        </Link>

        <Link
          className={`tab ${view === "history" ? "active" : ""}`}
          href="/portal/invoices?view=history"
        >
          Payment History
          <span>{paymentCount}</span>
        </Link>
      </nav>

      <section className="card invoice-main-card">
        <form className="toolbar invoice-filter-toolbar" method="GET">
          <input type="hidden" name="view" value={view} />

          <div className="field-inline">
            <label htmlFor="invoice-from">From</label>
            <input
              id="invoice-from"
              name="from"
              type="date"
              defaultValue={query.from}
            />
          </div>

          <div className="field-inline">
            <label htmlFor="invoice-to">To</label>
            <input
              id="invoice-to"
              name="to"
              type="date"
              defaultValue={query.to}
            />
          </div>

          <button className="btn btn-secondary" type="submit">
            Apply Filter
          </button>

          <Link
            className="btn btn-secondary"
            href={`/portal/invoices?view=${view}`}
          >
            Reset
          </Link>
        </form>

        {view === "history" ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>
                        {payment.receiptNumber || "Pending"}
                      </strong>
                    </td>

                    <td>{payment.invoice.invoiceNumber}</td>

                    <td>{money(payment.amountCents)}</td>

                    <td>
                      {payment.paymentMethod || "Not available"}
                    </td>

                    <td>
                      <StatusBadge value={payment.status} />
                    </td>

                    <td>{dateTime(payment.paidAt)}</td>

                    <td className="actions">
                      <a
                        className="btn btn-secondary btn-sm"
                        href={`/print/receipt/${payment.id}`}
                      >
                        Receipt
                      </a>

                      {payment.invoice.agreement ? (
                        <a
                          className="btn btn-secondary btn-sm"
                          href={`/print/agreement/${payment.invoice.agreement.id}`}
                        >
                          Agreement
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}

                {!payments.length ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">
                        No payment history found.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Summary</th>
                  <th>Amount</th>
                  <th>Effective Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {(view === "all" ? allInvoices : dueInvoices).map(
                  (invoice) => {
                    const overdue = invoiceIsOverdue(invoice);
                    const payable = ["SENT", "VIEWED", "UNPAID"].includes(
                      invoice.status
                    );

                    return (
                      <tr key={invoice.id}>
                        <td>
                          <strong>{invoice.invoiceNumber}</strong>
                          <div className="text-small text-muted">
                            {date(invoice.invoiceDate)}
                          </div>
                        </td>

                        <td>
                          {invoice.description}
                          <div className="text-small text-muted">
                            {invoice.notes || "No extra notes"}
                          </div>
                        </td>

                        <td>{money(invoice.amountCents)}</td>

                        <td>
                          {date(effectiveInvoiceDueDate(invoice))}

                          {invoice.isFirstInvoice ? (
                            <div className="text-small text-muted">
                              First-month grace applied
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <StatusBadge
                            value={overdue ? "OVERDUE" : invoice.status}
                          />
                        </td>

                        <td className="actions">
                          <Link
                            className="btn btn-secondary btn-sm"
                            href={`/print/invoice/${invoice.id}`}
                          >
                            View Invoice
                          </Link>

                          {payable ? (
                            <Link
                              className="btn btn-primary btn-sm"
                              href={`/portal/invoices/${invoice.id}/pay`}
                            >
                              {firstPaymentPending
                                ? "Acknowledge & Pay"
                                : "Pay Invoice"}
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  }
                )}

                {!(view === "all" ? allInvoices : dueInvoices).length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">
                        {view === "due"
                          ? "No due invoices."
                          : "No invoices found."}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          pathname="/portal/invoices"
          searchParams={{
            view,
            from: query.from,
            to: query.to
          }}
        />
      </section>
    </>
  );
}
