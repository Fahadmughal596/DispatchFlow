import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { dateRange, loadTabWhere, PAGE_SIZE, positivePage } from "@/lib/portal-filters";
import { dateTime, money } from "@/lib/utils";

const tabs = [
  { value: "active", label: "Active Loads" },
  { value: "scheduled", label: "Scheduled Loads" },
  { value: "previous", label: "Previous Loads" },
  { value: "completed", label: "Completed Loads" }
];

export default async function TruckerLoadsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requireRole("TRUCKER");
  const query = await searchParams;
  const tab = tabs.some((item) => item.value === query.tab) ? query.tab! : "active";
  const page = positivePage(query.page);

  const where = {
    truckerId: user.truckerProfile!.id,
    AND: [
      loadTabWhere(tab),
      dateRange(query.from, query.to, "pickupAt"),
      query.status ? { status: query.status as never } : {}
    ]
  };

  const [total, loads, lastCompleted, counts] = await Promise.all([
    db.load.count({ where }),
    db.load.findMany({
      where,
      include: { documents: true },
      orderBy: [{ pickupAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    db.load.findFirst({
      where: {
        truckerId: user.truckerProfile!.id,
        status: { in: ["DROPPED_OFF", "DELIVERED", "COMPLETED"] }
      },
      orderBy: [{ deliveryAt: "desc" }, { updatedAt: "desc" }]
    }),
    Promise.all(tabs.map(async (item) => ({
      value: item.value,
      count: await db.load.count({
        where: { truckerId: user.truckerProfile!.id, ...loadTabWhere(item.value) }
      })
    })))
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="page-header">
        <div><h1>Loads</h1><p>Active, scheduled, previous and completed load views with compulsory pagination.</p></div>
      </div>

      {lastCompleted ? (
        <div className="card last-completed-card" style={{ marginBottom: 18 }}>
          <div><span className="badge badge-green">Last Completed</span><h2>{lastCompleted.loadRef}</h2></div>
          <div className="detail-list">
            <div className="detail"><span>Route</span><strong>{lastCompleted.pickupLocation} → {lastCompleted.deliveryLocation}</strong></div>
            <div className="detail"><span>Rate</span><strong>{money(lastCompleted.rateCents)}</strong></div>
            <div className="detail"><span>Completed</span><strong>{dateTime(lastCompleted.deliveryAt)}</strong></div>
          </div>
        </div>
      ) : null}

      <div className="tabs" style={{ marginBottom: 18 }}>
        {tabs.map((item) => (
          <Link className={`tab ${tab === item.value ? "active" : ""}`} href={`/portal/loads?tab=${item.value}`} key={item.value}>
            {item.label} <span>{counts.find((count) => count.value === item.value)?.count || 0}</span>
          </Link>
        ))}
      </div>

      <div className="card">
        <details className="filter-panel" open={Boolean(query.from || query.to || query.status)}>
          <summary className="btn btn-secondary">Filter Loads</summary>
          <form className="toolbar filter-toolbar" method="GET">
            <input type="hidden" name="tab" value={tab} />
            <div className="field-inline"><label>From</label><input name="from" type="date" defaultValue={query.from} /></div>
            <div className="field-inline"><label>To</label><input name="to" type="date" defaultValue={query.to} /></div>
            <div className="field-inline">
              <label>Status</label>
              <select name="status" defaultValue={query.status || ""}>
                <option value="">All statuses</option>
                {['BOOKED','PICKED_UP','DROPPED_OFF','CANCELLED'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <button className="btn btn-primary">Apply</button>
            <Link className="btn btn-secondary" href={`/portal/loads?tab=${tab}`}>Reset</Link>
          </form>
        </details>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead><tr><th>Load</th><th>Pickup</th><th>Delivery</th><th>Rate</th><th>Broker</th><th>Status</th><th>Documents</th></tr></thead>
            <tbody>
              {loads.map((load) => (
                <tr key={load.id}>
                  <td><strong>{load.loadRef}</strong><div className="text-small text-muted">{dateTime(load.pickupAt)}</div></td>
                  <td>{load.pickupLocation}</td>
                  <td>{load.deliveryLocation}<div className="text-small text-muted">{dateTime(load.deliveryAt)}</div></td>
                  <td>{money(load.rateCents)}</td>
                  <td>{load.broker || "—"}</td>
                  <td><StatusBadge value={load.status} /></td>
                  <td>
                    <div className="actions">
                      {load.documents.map((document) => (
                        <a className="btn btn-secondary btn-sm" href={`/api/load-documents/${document.id}`} key={document.id}>{document.type}</a>
                      ))}
                      {!load.documents.length ? "None" : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loads.length ? <tr><td colSpan={7}><div className="empty">No loads match this tab and filter.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          pathname="/portal/loads"
          searchParams={{ tab, from: query.from, to: query.to, status: query.status }}
        />
      </div>
    </>
  );
}
