import { requireRole } from "@/lib/auth";
import { updateConsultantProfileAction } from "@/actions/profile";
import { Flash } from "@/components/flash";

export default async function ConsultantProfilePage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const profile = user.consultantProfile;

  return (
    <>
      <div className="page-header"><div><h1>Profile</h1><p>Your trucker-facing profile and dispatch commission settings.</p></div></div>
      <Flash success={query.success} />
      <div className="card">
        <form action={updateConsultantProfileAction}>
          <div className="form-grid">
            <div className="field"><label>Full name</label><input name="name" defaultValue={user.name} required /></div>
            <div className="field"><label>Email</label><input value={user.email} disabled /></div>
            <div className="field"><label>Phone</label><input name="phone" defaultValue={user.phone || ""} /></div>
            <div className="field"><label>Specialty</label><input name="specialty" defaultValue={profile?.specialty || ""} /></div>
            <div className="field"><label>Working hours</label><input name="workingHours" defaultValue={profile?.workingHours || ""} /></div>
            <div className="field"><label>Time zone</label><input name="timeZone" defaultValue={profile?.timeZone || ""} /></div>
            <div className="field"><label>Dispatch commission (%)</label><input name="commissionRate" type="number" step="0.01" min="0" max="100" defaultValue={(profile?.commissionRateBps || 500) / 100} /></div>
          </div>
          <div className="field"><label>Bio</label><textarea name="bio" defaultValue={profile?.bio || ""} /></div>
          <button className="btn btn-primary">Save Profile</button>
        </form>
      </div>
    </>
  );
}
