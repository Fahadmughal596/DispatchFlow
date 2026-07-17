import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { reassignLeadAction } from "@/actions/admin";
import { StatusBadge } from "@/components/status-badge";
import { dateTime } from "@/lib/utils";

export default async function AdminLeadsPage() {
  await requireRole("SUPER_ADMIN");
  const [leads, consultants] = await Promise.all([
    db.lead.findMany({
      include: {
        trucker: { include: { user: true } },
        assignedTo: true
      },
      orderBy: { signupAt: "desc" }
    }),
    db.user.findMany({
      where: {
        role: "CONSULTANT_DISPATCHER",
        status: "ACTIVE"
      },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <>
      <div className="page-header"><div><h1>Leads & Assignment</h1><p>Neutral round-robin by default, with audited manual override.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Trucker</th><th>Signup</th><th>Status</th><th>Assigned to</th><th>Method</th><th>Manual override</th></tr></thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td><strong>{lead.trucker.user.name}</strong><div className="text-small text-muted">{lead.trucker.companyName || "No company"}</div></td>
                  <td>{dateTime(lead.signupAt)}</td>
                  <td><StatusBadge value={lead.currentStatus} /></td>
                  <td>{lead.assignedTo?.name || "Unassigned"}</td>
                  <td>{lead.assignmentMethod || "—"}</td>
                  <td>
                    <form className="actions" action={reassignLeadAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select name="consultantId" defaultValue={lead.assignedToId || ""} required>
                        <option value="">Select consultant</option>
                        {consultants.map((consultant) => <option value={consultant.id} key={consultant.id}>{consultant.name}</option>)}
                      </select>
                      <input name="reason" placeholder="Reason" />
                      <button className="btn btn-secondary btn-sm">Reassign</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!leads.length ? <tr><td colSpan={6}><div className="empty">No leads.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
