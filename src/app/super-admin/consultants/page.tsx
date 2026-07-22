import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDispatcherAction, toggleDispatcherPauseAction, updateDispatcherControlsAction } from "@/actions/admin";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminConsultantsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireRole("SUPER_ADMIN");
  const query = await searchParams;
  const consultants = await db.user.findMany({
    where: { role: "CONSULTANT_DISPATCHER" },
    include: { consultantProfile: true, assignedLeads: true, assignedTruckers: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>Consultants / Dispatchers</h1><p>Create accounts and control availability, capacity, and round-robin priority.</p></div></div>
      <Flash success={query.success} error={query.error} />
      <div className="grid grid-2 admin-consultant-top">
        <div className="card">
          <div className="card-title"><div><h2>Add Consultant / Dispatcher</h2><p>Creates a login immediately.</p></div></div>
          <form action={createDispatcherAction}>
            <div className="form-grid">
              <div className="field"><label>Full name</label><input name="name" required /></div>
              <div className="field"><label>Email</label><input name="email" type="email" required /></div>
              <div className="field"><label>Phone</label><input name="phone" /></div>
              <div className="field"><label>Expertise</label><input name="specialty" placeholder="Dry van, reefer, flatbed..." /></div>
              <div className="field"><label>Service duration</label><input name="serviceDuration" placeholder="e.g. 4 years" /></div>
              <div className="field"><label>Initial total loads</label><input name="initialLoadCount" type="number" min="0" defaultValue="0" /></div>
              <div className="field"><label>Temporary password</label><input name="password" type="password" minLength={8} required /></div>
            </div>
            <button className="btn btn-primary">Create Consultant / Dispatcher</button>
          </form>
        </div>
        <div className="card admin-summary-card">
          <div className="card-title"><div><h2>Control guide</h2><p>Priority weight influences upcoming lead distribution while paused or disabled accounts receive none.</p></div></div>
          <div className="snapshot-grid">
            <div><span>Total</span><strong>{consultants.length}</strong></div>
            <div><span>Active</span><strong>{consultants.filter((item) => item.status === "ACTIVE" && !item.consultantProfile?.isPaused).length}</strong></div>
            <div><span>Paused</span><strong>{consultants.filter((item) => item.consultantProfile?.isPaused).length}</strong></div>
            <div><span>Assigned truckers</span><strong>{consultants.reduce((sum, item) => sum + item.assignedTruckers.length, 0)}</strong></div>
          </div>
        </div>
      </div>

      <div className="dispatcher-admin-grid">
        {consultants.map((consultant) => (
          <article className="card dispatcher-admin-card" key={consultant.id}>
            <div className="dispatcher-admin-heading">
              <div className="avatar">{consultant.name.slice(0, 1).toUpperCase()}</div>
              <div><h2>{consultant.name}</h2><p>{consultant.email}</p></div>
              <StatusBadge value={consultant.consultantProfile?.isPaused ? "PAUSED" : consultant.status} />
            </div>
            <div className="dispatcher-admin-stats">
              <span><small>Assigned leads</small><strong>{consultant.assignedLeads.length}</strong></span>
              <span><small>Truckers</small><strong>{consultant.assignedTruckers.length}</strong></span>
            </div>
            <form action={updateDispatcherControlsAction} className="dispatcher-control-form">
              <input type="hidden" name="userId" value={consultant.id} />
              <div className="field"><label>Status</label><select name="status" defaultValue={consultant.status}><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="DISABLED">Disabled</option></select></div>
              <div className="field"><label>Phone</label><input name="phone" defaultValue={consultant.consultantProfile?.phone || consultant.phone || ""} /></div>
              <div className="field"><label>Expertise</label><input name="specialty" defaultValue={consultant.consultantProfile?.specialty || ""} /></div>
              <div className="field"><label>Service duration</label><input name="serviceDuration" defaultValue={consultant.consultantProfile?.serviceDuration || ""} /></div>
              <div className="field"><label>Initial total loads</label><input name="initialLoadCount" type="number" min="0" defaultValue={consultant.consultantProfile?.initialLoadCount || 0} /></div>
              <div className="field"><label>Priority weight</label><input name="priorityWeight" type="number" min="1" defaultValue={consultant.consultantProfile?.priorityWeight || 1} /></div>
              <div className="field"><label>Maximum lead cap</label><input name="maxLeadCap" type="number" min="0" defaultValue={consultant.consultantProfile?.maxLeadCap || 100} /></div>
              
              <button className="btn btn-primary">Save Controls</button>
            </form>
            <form action={toggleDispatcherPauseAction}>
              <input type="hidden" name="userId" value={consultant.id} />
              <button className="btn btn-secondary btn-sm" style={{ width: "100%" }}>{consultant.consultantProfile?.isPaused ? "Resume round-robin" : "Pause round-robin"}</button>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
