import { requireRole } from "@/lib/auth";
import { updateConsultantProfileAction } from "@/actions/profile";
import { Flash } from "@/components/flash";

export default async function ConsultantProfilePage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const profile = user.consultantProfile;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>
            Manage the professional information shown to your assigned
            truckers.
          </p>
        </div>
      </div>

      <Flash success={query.success} error={query.error} />

      <div className="card">
        <form action={updateConsultantProfileAction}>
          <div className="form-grid">
            <div className="field">
              <label>Full name</label>
              <input
                name="name"
                defaultValue={user.name}
                required
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled />
            </div>

            <div className="field">
              <label>Phone</label>
              <input
                name="phone"
                defaultValue={user.phone || ""}
              />
            </div>

            <div className="field">
              <label>Specialty</label>
              <input
                name="specialty"
                defaultValue={profile?.specialty || ""}
              />
            </div>

            <div className="field">
              <label>Working hours</label>
              <input
                name="workingHours"
                defaultValue={profile?.workingHours || ""}
              />
            </div>

            <div className="field">
              <label>Time zone</label>
              <input
                name="timeZone"
                defaultValue={profile?.timeZone || ""}
              />
            </div>
          </div>

          <div className="field">
            <label>Bio</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio || ""}
            />
          </div>

          <button className="btn btn-primary">
            Save Profile
          </button>
        </form>
      </div>
    </>
  );
}
