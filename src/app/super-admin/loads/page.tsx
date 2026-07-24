import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateLoadStatusAction } from "@/actions/loads";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { dateRange, PAGE_SIZE, positivePage } from "@/lib/portal-filters";
import { dateTime, money } from "@/lib/utils";

const statuses = ["BOOKED", "PICKED_UP", "DROPPED_OFF", "CANCELLED"];

export default async function AdminLoadsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; status?: string; from?: string; to?: string }>;
}) {
  await requireRole("SUPER_ADMIN");
  const query = await searchParams;
  const page = positivePage(query.page);
  const where = {
    AND: [
      dateRange(query.from, query.to, "pickupAt"),
      query.status ? { status: query.status as never } : {}
    ]
  };

  const [total, loads] = await Promise.all([
    db.load.count({ where }),
    db.load.findMany({
      where,
      include: {
        trucker: { include: { user: true } },
        consultant: true,
        documents: true
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  return (
    <>
      <div className="page-header"><div><h1>Loads</h1><p>Global load oversight with status, date filters and pagination.</p></div></div>
      <div className="card">
        <form className="toolbar" method="GET">
          <div className="field-inline"><label>From</label><input name="from" type="date" defaultValue={query.from} /></div>
          <div className="field-inline"><label>To</label><input name="to" type="date" defaultValue={query.to} /></div>
          <div className="field-inline"><label>Status</label><select name="status" defaultValue={query.status || ""}><option value="">All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
          <button className="btn btn-primary">Filter</button>
          <Link className="btn btn-secondary" href="/super-admin/loads">Reset</Link>
        </form>

        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Load</th><th>Trucker</th><th>Consultant</th><th>Route</th><th>Rate</th><th>Status</th><th>Pickup</th><th>Actions</th></tr></thead>
            <tbody>
              {loads.map((load) => (
                <tr key={load.id}>
                  <td><strong>{load.loadRef}</strong><div className="text-small text-muted">{load.documents.length} documents</div></td>
                  <td>{load.trucker.user.name}</td>
                  <td>{load.consultant.name}</td>
                  <td>{load.pickupLocation} → {load.deliveryLocation}</td>
                  <td>{money(load.rateCents)}</td>
                  <td><StatusBadge value={load.status} /></td>
                  <td>{dateTime(load.pickupAt)}</td>
                  <td>
                    <div className="actions">
                      <Link
                        className="btn btn-primary btn-sm"
                        href={`/super-admin/loads/${load.id}`}
                      >
                        View
                      </Link>

                      <form
                        className="actions"
                        action={updateLoadStatusAction}
                      >
                      <input type="hidden" name="loadId" value={load.id} />
                      <select name="status" defaultValue={statuses.includes(load.status) ? load.status : "BOOKED"}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
                      <button className="btn btn-secondary btn-sm">Save</button>
                    </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!loads.length ? <tr><td colSpan={8}><div className="empty">No loads found.</div></td></tr> : null}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} pathname="/super-admin/loads" searchParams={{ status: query.status, from: query.from, to: query.to }} />
      </div>
    </>
  );
}
