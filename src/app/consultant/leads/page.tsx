import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { dateTime } from "@/lib/utils";
import { updateLeadNotesAction } from "@/actions/leads";

export default async function ConsultantLeadsPage({
  searchParams
}: {
  searchParams: Promise<{ trucker?: string }>;
}) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const leads = await db.lead.findMany({
    where: { assignedToId: user.id },
    include: {
      trucker: {
        include: {
          user: true,
          conversations: { where: { consultantId: user.id }, take: 1 },
          invoices: { orderBy: { createdAt: "desc" }, take: 1 }
        }
      }
    },
    orderBy: { signupAt: "desc" }
  });
  const selected = leads.find((lead) => lead.truckerId === Number(query.trucker)) || leads[0];

  return (
    <>
      <div className="page-header"><div><h1>Assigned Leads</h1><p>Open a lead, chat, record internal notes and move through the clean lead sequence.</p></div></div>
      <div className="split">
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Lead</th><th>Equipment</th><th>Location</th><th>Status</th><th>Last invoice</th><th>Action</th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td><strong>{lead.trucker.user.name}</strong><div className="text-small text-muted">{dateTime(lead.signupAt)}</div></td>
                    <td>{lead.trucker.equipmentType || "—"}</td>
                    <td>{lead.trucker.truckCurrentLocation || "—"}</td>
                    <td><StatusBadge value={lead.currentStatus} /></td>
                    <td>{lead.trucker.invoices[0]?.status.replaceAll("_", " ") || "None"}</td>
                    <td className="actions">
                      <Link className="btn btn-secondary btn-sm" href={`/consultant/leads?trucker=${lead.truckerId}`}>Open</Link>
                      {lead.trucker.conversations[0] ? <Link className="btn btn-primary btn-sm" href={`/consultant/chat?conversation=${lead.trucker.conversations[0].id}`}>Chat</Link> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card sticky-card">
          {selected ? (
            <>
              <div className="card-title"><div><h2>{selected.trucker.user.name}</h2><p>Internal lead workspace</p></div><StatusBadge value={selected.currentStatus} /></div>
              <form action={updateLeadNotesAction}>
                <input type="hidden" name="truckerId" value={selected.truckerId} />
                <div className="field"><label>Company name</label><input name="companyName" defaultValue={selected.trucker.companyName || ""} /></div>
                <div className="form-grid">
                  <div className="field"><label>MC / DOT</label><input name="mcDot" defaultValue={selected.trucker.mcDot || ""} /></div>
                  <div className="field"><label>Equipment</label><input name="equipmentType" defaultValue={selected.trucker.equipmentType || ""} /></div>
                  <div className="field"><label>Truck location</label><input name="truckCurrentLocation" defaultValue={selected.trucker.truckCurrentLocation || ""} /></div>
                  <div className="field"><label>Availability</label><input name="availability" defaultValue={selected.trucker.availability || ""} /></div>
                  <div className="field"><label>Factoring company</label><input name="factoringCompany" defaultValue={selected.trucker.factoringCompany || ""} /></div>
                  <div className="field"><label>Insurance status</label><input name="insuranceStatus" defaultValue={selected.trucker.insuranceStatus || ""} /></div>
                </div>
                <div className="field"><label>Preferred lanes</label><textarea name="preferredLanes" defaultValue={selected.trucker.preferredLanes || ""} /></div>
                <div className="field"><label>Avoided lanes</label><textarea name="avoidedLanes" defaultValue={selected.trucker.avoidedLanes || ""} /></div>
                <div className="field"><label>Main problem / Consultant notes</label><textarea name="mainProblem" defaultValue={selected.trucker.mainProblem || ""} /></div>
                <button className="btn btn-primary">Save Internal Notes</button>
              </form>
            </>
          ) : <div className="empty">No assigned lead selected.</div>}
        </div>
      </div>
    </>
  );
}
