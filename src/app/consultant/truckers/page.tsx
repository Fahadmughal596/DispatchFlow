import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";

export default async function ConsultantTruckersPage() {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const truckers = await db.truckerProfile.findMany({
    where: { assignedConsultantId: user.id },
    include: {
      user: true,
      lead: true,
      conversations: { where: { consultantId: user.id }, take: 1 },
      documents: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      loads: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>Assigned Truckers</h1><p>Only truckers assigned by round-robin or Super Admin are visible.</p></div></div>
      <div className="grid grid-3">
        {truckers.map((trucker) => (
          <div className="card" key={trucker.id}>
            <div className="profile-card">
              <div className="profile-photo">{trucker.user.name.slice(0, 1)}</div>
              <div>
                <h2>{trucker.user.name}</h2>
                <p>{trucker.companyName || "No company name"}</p>
                <StatusBadge value={trucker.accountStatus} />
              </div>
            </div>
            <div className="divider" />
            <div className="detail-list">
              <div className="detail"><span>Equipment</span><strong>{trucker.equipmentType || "—"}</strong></div>
              <div className="detail"><span>Location</span><strong>{trucker.truckCurrentLocation || "—"}</strong></div>
              <div className="detail"><span>Documents</span><strong>{trucker.documents.length}</strong></div>
              <div className="detail"><span>Latest load</span><strong>{trucker.loads[0]?.loadRef || "None"}</strong></div>
            </div>
            <div className="profile-actions">
              <Link className="btn btn-secondary btn-sm" href={`/consultant/leads?trucker=${trucker.id}`}>Open Profile</Link>
              {trucker.conversations[0] ? <Link className="btn btn-primary btn-sm" href={`/consultant/chat?conversation=${trucker.conversations[0].id}`}>Chat</Link> : null}
            </div>
          </div>
        ))}
        {!truckers.length ? <div className="empty">No assigned truckers.</div> : null}
      </div>
    </>
  );
}
