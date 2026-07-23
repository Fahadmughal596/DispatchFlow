import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createLoadAction, updateLoadStatusAction, uploadLoadDocumentAction } from "@/actions/loads";
import { Flash } from "@/components/flash";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { dateRange, loadTabWhere, PAGE_SIZE, positivePage } from "@/lib/portal-filters";
import { dateTime, money } from "@/lib/utils";

const statuses = ["BOOKED", "PICKED_UP", "DROPPED_OFF", "CANCELLED"];
const tabs = [
  { value: "active", label: "Active Loads" },
  { value: "scheduled", label: "Scheduled Loads" },
  { value: "previous", label: "Previous Loads" },
  { value: "completed", label: "Completed Loads" }
];

export default async function ConsultantLoadsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string; tab?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const tab = tabs.some((item) => item.value === query.tab) ? query.tab! : "active";
  const page = positivePage(query.page);

  const where = {
    consultantId: user.id,
    AND: [
      loadTabWhere(tab),
      dateRange(query.from, query.to, "pickupAt"),
      query.status ? { status: query.status as never } : {}
    ]
  };

  const [truckers, total, loads, lastCompleted] = await Promise.all([
    db.truckerProfile.findMany({
      where: { assignedConsultantId: user.id, accountStatus: "ACTIVE" },
      include: { user: true },
      orderBy: { user: { name: "asc" } }
    }),
    db.load.count({ where }),
    db.load.findMany({
      where,
      include: {
        trucker: { include: { user: true } },
        documents: true,
        invoice: { include: { payment: true } }
      },
      orderBy: [{ pickupAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    db.load.findFirst({
      where: { consultantId: user.id, status: { in: ["DROPPED_OFF", "DELIVERED", "COMPLETED"] } },
      include: { trucker: { include: { user: true } } },
      orderBy: [{ deliveryAt: "desc" }, { updatedAt: "desc" }]
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="page-header"><div><h1>Loads</h1><p>Create and manage assigned active trucker loads.</p></div></div>
      <Flash success={query.success} error={query.error} />

      {lastCompleted ? (
        <div className="card last-completed-card" style={{ marginBottom: 18 }}>
          <div><span className="badge badge-green">Last Completed</span><h2>{lastCompleted.loadRef}</h2><p>{lastCompleted.trucker.user.name}</p></div>
          <div className="detail-list">
            <div className="detail"><span>Route</span><strong>{lastCompleted.pickupLocation} → {lastCompleted.deliveryLocation}</strong></div>
            <div className="detail"><span>Rate</span><strong>{money(lastCompleted.rateCents)}</strong></div>
            <div className="detail"><span>Completed</span><strong>{dateTime(lastCompleted.deliveryAt)}</strong></div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title"><div><h2>Create Load Entry</h2><p>Only assigned active/paid truckers are available.</p></div></div>
        <form action={createLoadAction}>
          <div className="form-grid">
            <div className="field">
              <label>Active trucker</label>
              <select name="truckerId" required>
                <option value="">Select active trucker</option>
                {truckers.map((trucker) => <option key={trucker.id} value={trucker.id}>{trucker.user.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Broker</label><input name="broker" /></div>
            <div className="field"><label>Pickup location</label><input name="pickupLocation" required /></div>
            <div className="field"><label>Pickup date/time</label><input name="pickupAt" type="datetime-local" /></div>
            <div className="field"><label>Delivery location</label><input name="deliveryLocation" required /></div>
            <div className="field"><label>Delivery date/time</label><input name="deliveryAt" type="datetime-local" /></div>
            <div className="field"><label>Rate (USD)</label><input name="rate" type="number" step="0.01" min="1" required /></div>
            <div className="field">
              <label>Status</label>
              <select name="status" defaultValue="BOOKED">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea name="notes" /></div>
          <button className="btn btn-primary">Create Load</button>
        </form>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {tabs.map((item) => (
          <Link className={`tab ${tab === item.value ? "active" : ""}`} href={`/consultant/loads?tab=${item.value}`} key={item.value}>{item.label}</Link>
        ))}
      </div>

      <div className="card">
        <details className="filter-panel" open={Boolean(query.from || query.to || query.status)}>
          <summary className="btn btn-secondary">Filter Loads</summary>
          <form className="toolbar filter-toolbar" method="GET">
            <input type="hidden" name="tab" value={tab} />
            <div className="field-inline"><label>From</label><input name="from" type="date" defaultValue={query.from} /></div>
            <div className="field-inline"><label>To</label><input name="to" type="date" defaultValue={query.to} /></div>
            <div className="field-inline"><label>Status</label><select name="status" defaultValue={query.status || ""}><option value="">All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
            <button className="btn btn-primary">Apply</button>
            <Link className="btn btn-secondary" href={`/consultant/loads?tab=${tab}`}>Reset</Link>
          </form>
        </details>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead><tr><th>Load</th><th>Trucker</th><th>Route</th><th>Rate</th><th>Status</th><th>Pickup</th><th>Documents</th><th>Invoice</th><th>Update</th></tr></thead>
            <tbody>
              {loads.map((load) => (
                <tr key={load.id}>
                  <td><strong>{load.loadRef}</strong></td>
                  <td>{load.trucker.user.name}</td>
                  <td>{load.pickupLocation} → {load.deliveryLocation}</td>
                  <td>{money(load.rateCents)}</td>
                  <td><StatusBadge value={load.status} /></td>
                  <td>{dateTime(load.pickupAt)}</td>
                  <td>
                    <div className="text-small text-muted" style={{ marginBottom: 8 }}>{load.documents.length} file(s)</div>
                    <form action={uploadLoadDocumentAction} className="compact-upload">
                      <input type="hidden" name="loadId" value={load.id} />
                      <select name="type" required defaultValue=""><option value="" disabled>Document type</option>{["Rate Confirmation", "BOL", "POD", "Lumper Receipt", "Detention Proof", "Broker Document", "Other"].map((type) => <option key={type}>{type}</option>)}</select>
                      <input name="file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required />
                      <button className="btn btn-secondary btn-sm">Upload</button>
                    </form>
                  </td>
                  <td>
                    {load.invoice ? (
                      <div className="actions">
                        <div>
                          <strong>{load.invoice.invoiceNumber}</strong>
                          <div className="text-small text-muted">
                            <StatusBadge value={load.invoice.status} />
                          </div>
                        </div>

                        <Link
                          className="btn btn-secondary btn-sm"
                          href={`/print/invoice/${load.invoice.id}`}
                        >
                          View
                        </Link>
                      </div>
                    ) : (
                      <span className="text-small text-muted">
                        No invoice
                      </span>
                    )}
                  </td>

                  <td>
                    <form className="actions" action={updateLoadStatusAction}>
                      <input type="hidden" name="loadId" value={load.id} />
                      <select name="status" defaultValue={statuses.includes(load.status) ? load.status : "BOOKED"}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
                      <button className="btn btn-secondary btn-sm">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!loads.length ? <tr><td colSpan={9}><div className="empty">No loads match this tab and filter.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} pathname="/consultant/loads" searchParams={{ tab, from: query.from, to: query.to, status: query.status }} />
      </div>
    </>
  );
}
