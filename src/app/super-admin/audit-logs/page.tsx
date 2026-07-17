import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/utils";

export default async function AuditLogsPage() {
  await requireRole("SUPER_ADMIN");
  const logs = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <>
      <div className="page-header"><div><h1>Audit Logs</h1><p>Recent administrative and workflow activity.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>ID</th><th>New value</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{dateTime(log.createdAt)}</td>
                  <td>{log.actor?.name || "System"}</td>
                  <td><strong>{log.action}</strong></td>
                  <td>{log.entityType}</td>
                  <td>{log.entityId || "—"}</td>
                  <td><div className="text-small text-muted" style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>{log.newValue ? JSON.stringify(log.newValue) : "—"}</div></td>
                </tr>
              ))}
              {!logs.length ? <tr><td colSpan={6}><div className="empty">No audit logs.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
