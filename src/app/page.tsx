import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";

const workflow = [
  "Sign Up",
  "Auto Account",
  "Round-Robin Assignment",
  "Portal Chat",
  "Contact Made",
  "Invoice Sent",
  "Acknowledge & Pay",
  "Active Client",
  "Load Entries"
];

export default async function HomePage() {
  const user = await currentUser();

  return (
    <>
      <nav className="public-nav">
        <div className="container public-nav-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">DF</span>
            <span>
              DispatchFlow
              <small>Union Enterprises Pakistan</small>
            </span>
          </Link>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="btn btn-primary" href={ROLE_HOME[user.role]}>Open Dashboard</Link>
                <Link className="btn btn-secondary" href="/logout-info">Sign out inside portal</Link>
              </>
            ) : (
              <>
                <Link className="btn btn-secondary" href="/login">Log in</Link>
                <Link className="btn btn-primary" href="/signup">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Portal chat primary · T2F optional</span>
              <h1>
                Dispatch onboarding, payments and loads in one{" "}
                <span className="gradient-text">simple portal.</span>
              </h1>
              <p>
                Email or Google signup, guided onboarding, assigned dispatcher, mandatory documents, chat attachments, invoice payment and filtered post-activation loads.
              </p>
              <div className="hero-actions">
                {user ? (
                  <Link className="btn btn-primary" href={ROLE_HOME[user.role]}>Open My Dashboard</Link>
                ) : (
                  <>
                    <Link className="btn btn-primary" href="/signup">Create Trucker Account</Link>
                    <Link className="btn btn-secondary" href="/login">Open Portal</Link>
                  </>
                )}
              </div>
            </div>

            <div className="hero-card">
              <div className="card-title">
                <div>
                  <h2>Portal workflow</h2>
                  <p>From signup to active client</p>
                </div>
                <span className="badge badge-green">Next.js Build</span>
              </div>
              <div className="workflow-list">
                {workflow.map((step, index) => (
                  <div className="workflow-item" key={step}>
                    <span className="workflow-index">{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
              <div className="metric-grid">
                <div className="metric"><strong>3</strong><span>Separate role portals</span></div>
                <div className="metric"><strong>1</strong><span>Shared secure backend</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-title">
              <h2>One full-stack Next.js application</h2>
              <p>
                App Router pages, Server Actions, Route Handlers, Prisma and MySQL
                replace Laravel controllers, Livewire components, Eloquent and Blade.
              </p>
            </div>
            <div className="feature-grid">
              {[
                ["RB", "Role isolation", "Trucker, Consultant / Dispatcher and Super Admin routes are protected separately."],
                ["CH", "Portal chat", "Messages are stored in MySQL and Contact Made is validated only after both sides reply."],
                ["DO", "Required documents", "MC Permit, COI and Driver's License with persistent missing alerts and secure file downloads."],
                ["IN", "Invoice workflow", "Dispatcher drafts, admin approval, trucker portal invoice and demo payment flow."],
                ["AG", "First agreement", "First successful payment includes agreement acceptance and client activation."],
                ["LO", "Load operations", "Load entries become available only after the trucker becomes an active paid client."]
              ].map(([icon, title, text]) => (
                <div className="feature" key={title}>
                  <div className="feature-icon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">DispatchFlow · Union Enterprises Pakistan</div>
      </footer>
    </>
  );
}
