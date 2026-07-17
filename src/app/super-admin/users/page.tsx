import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { dateTime } from "@/lib/utils";

export default async function AdminUsersPage() {
  await requireRole("SUPER_ADMIN");
  const users = await db.user.findMany({
    include: { truckerProfile: true, consultantProfile: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>All Users</h1><p>Trucker, Consultant / Dispatcher and Super Admin accounts.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Phone</th><th>Account detail</th><th>Created</th><th>Last login</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><div className="text-small text-muted">{user.email}</div></td>
                  <td>{user.role.replaceAll("_", " ")}</td>
                  <td><StatusBadge value={user.status} /></td>
                  <td>{user.phone || "—"}</td>
                  <td>{user.truckerProfile?.accountStatus || (user.consultantProfile?.isPaused ? "PAUSED" : "—")}</td>
                  <td>{dateTime(user.createdAt)}</td>
                  <td>{dateTime(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
