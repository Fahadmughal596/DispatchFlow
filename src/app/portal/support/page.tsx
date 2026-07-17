import { contactSuperAdminAction } from "@/actions/support";
import { Flash } from "@/components/flash";
import { requireRole } from "@/lib/auth";

type SupportQuery = {
  success?: string;
  error?: string;
};

export default async function TruckerSupportPage({
  searchParams
}: {
  searchParams: Promise<SupportQuery>;
}) {
  const user = await requireRole("TRUCKER");
  const query = await searchParams;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Contact Super Admin</h1>
          <p>Send an account, billing, access, or support request directly to Super Admin.</p>
        </div>
      </div>

      <Flash success={query.success} error={query.error} />

      <div className="grid grid-2 support-page-grid">
        <section className="card">
          <div className="card-title">
            <div>
              <h2>New support request</h2>
              <p>Super Admin will receive an in-portal notification.</p>
            </div>
          </div>

          <form action={contactSuperAdminAction}>
            <div className="field">
              <label htmlFor="support-name">Your account</label>
              <input id="support-name" value={`${user.name} — ${user.email}`} readOnly />
            </div>

            <div className="field">
              <label htmlFor="support-subject">Subject</label>
              <input
                id="support-subject"
                name="subject"
                maxLength={120}
                placeholder="Example: Account access issue"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="support-message">Message</label>
              <textarea
                id="support-message"
                name="message"
                maxLength={3000}
                placeholder="Explain the issue and include any useful details."
                required
              />
            </div>

            <button className="btn btn-primary" type="submit">
              Send to Super Admin
            </button>
          </form>
        </section>

        <aside className="card support-info-card">
          <div className="card-title">
            <div>
              <h2>What happens next?</h2>
              <p>Your request is recorded securely in the portal.</p>
            </div>
          </div>

          <div className="support-info-list">
            <div><strong>1</strong><span>Super Admin receives a notification.</span></div>
            <div><strong>2</strong><span>The request is added to the audit trail.</span></div>
            <div><strong>3</strong><span>Super Admin can review your account and follow up.</span></div>
          </div>
        </aside>
      </div>
    </>
  );
}
