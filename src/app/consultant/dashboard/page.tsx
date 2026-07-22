import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { ConsultantProfilePopup } from "@/components/consultant-profile-popup";
import { dateTime, money } from "@/lib/utils";

type DashboardPeriod = "week" | "month" | "six-months";

function startOfPeriod(period: DashboardPeriod) {
  const now = new Date();
  const start = new Date(now);

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "six-months") {
    start.setMonth(start.getMonth() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return start;
}

function periodLabel(period: DashboardPeriod) {
  if (period === "month") return "This Month";
  if (period === "six-months") return "Last 6 Months";
  return "This Week";
}

export default async function ConsultantDashboard({
  searchParams
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    period?: string;
  }>;
}) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const profile = user.consultantProfile;

  const period: DashboardPeriod =
    query.period === "month" ||
    query.period === "six-months"
      ? query.period
      : "week";

  const periodStart = startOfPeriod(period);
  const selectedPeriodLabel = periodLabel(period);

  const [
    assigned,
    contacted,
    activeTruckers,
    pendingInvoices,
    paidInvoices,
    unpaidInvoices,
    periodPaid,
    periodLoads,
    missingDocs
  ] = await Promise.all([
    db.lead.count({
      where: {
        assignedToId: user.id,
        createdAt: { gte: periodStart }
      }
    }),

    db.lead.count({
      where: {
        assignedToId: user.id,
        updatedAt: { gte: periodStart },
        currentStatus: {
          in: [
            "CONTACT_MADE",
            "CONTRACT_MADE",
            "PENDING_INVOICE",
            "INVOICE_SENT",
            "INVOICE_PAID"
          ]
        }
      }
    }),

    db.truckerProfile.count({
      where: {
        assignedConsultantId: user.id,
        accountStatus: "ACTIVE",
        activatedAt: { gte: periodStart }
      }
    }),

    db.invoice.count({
      where: {
        consultantId: user.id,
        createdAt: { gte: periodStart },
        status: {
          in: [
            "DRAFT",
            "PENDING_APPROVAL",
            "SENT",
            "VIEWED",
            "UNPAID"
          ]
        }
      }
    }),

    db.invoice.count({
      where: {
        consultantId: user.id,
        status: "PAID",
        paidAt: { gte: periodStart }
      }
    }),

    db.invoice.count({
      where: {
        consultantId: user.id,
        createdAt: { gte: periodStart },
        status: {
          in: ["UNPAID", "OVERDUE"]
        }
      }
    }),

    db.payment.aggregate({
      where: {
        invoice: {
          consultantId: user.id
        },
        status: "SUCCEEDED",
        paidAt: {
          gte: periodStart
        }
      },
      _sum: {
        dispatcherCommissionCents: true,
        amountCents: true
      }
    }),

    db.load.count({
      where: {
        consultantId: user.id,
        createdAt: {
          gte: periodStart
        }
      }
    }),

    db.documentRequest.count({
      where: {
        trucker: {
          assignedConsultantId: user.id
        },
        status: {
          in: [
            "REQUESTED",
            "REJECTED",
            "REPLACEMENT_REQUESTED",
            "EXPIRED"
          ]
        }
      }
    })
  ]);

  const latest = await db.lead.findMany({
    where: {
      assignedToId: user.id,
      updatedAt: { gte: periodStart }
    },
    include: { trucker: { include: { user: true, conversations: { where: { consultantId: user.id }, take: 1 }, invoices: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    orderBy: { updatedAt: "desc" }, take: 6
  });

  const stages = [
    ["Assigned", assigned], ["Contacted", contacted], ["Pending invoice", pendingInvoices], ["Paid", paidInvoices], ["Active", activeTruckers]
  ] as const;

  return (
    <>
      <style>{`
        .dispatcher-period-filter {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin:0 0 20px;
          padding:16px 18px;
          border:1px solid rgba(72,138,226,.22);
          border-radius:16px;
          background:linear-gradient(
            135deg,
            rgba(12,38,78,.92),
            rgba(5,23,52,.96)
          );
          box-shadow:0 14px 34px rgba(0,0,0,.16);
        }

        .dispatcher-period-filter > div span,
        .dispatcher-period-filter > div strong {
          display:block;
        }

        .dispatcher-period-filter > div span {
          color:#7f94b2;
          font-size:.68rem;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.08em;
        }

        .dispatcher-period-filter > div strong {
          margin-top:4px;
          color:#f4f8ff;
          font-size:1rem;
        }

        .dispatcher-period-tabs {
          display:flex;
          align-items:center;
          gap:5px;
          padding:5px;
          border:1px solid rgba(89,145,220,.18);
          border-radius:12px;
          background:rgba(2,13,31,.58);
        }

        .dispatcher-period-tabs a {
          min-height:36px;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:8px 14px;
          border-radius:9px;
          color:#8fa4c1;
          font-size:.75rem;
          font-weight:750;
          white-space:nowrap;
          transition:.2s ease;
        }

        .dispatcher-period-tabs a:hover {
          color:#fff;
          background:rgba(35,113,222,.16);
        }

        .dispatcher-period-tabs a.active {
          color:#fff;
          background:linear-gradient(
            135deg,
            #1768ed,
            #249eff
          );
          box-shadow:0 8px 20px rgba(20,112,238,.28);
        }

        @media (max-width:720px) {
          .dispatcher-period-filter {
            flex-direction:column;
            align-items:stretch;
          }

          .dispatcher-period-tabs {
            width:100%;
          }

          .dispatcher-period-tabs a {
            flex:1;
            min-width:0;
            padding:8px 6px;
            font-size:.68rem;
          }
        }

        @media (max-width:430px) {
          .dispatcher-period-tabs {
            flex-direction:column;
          }

          .dispatcher-period-tabs a {
            width:100%;
          }
        }
      `}</style>
      {!profile?.profileCompletedAt ? <ConsultantProfilePopup name={user.name} email={user.email} phone={user.phone} specialty={profile?.specialty} workingHours={profile?.workingHours} timeZone={profile?.timeZone} bio={profile?.bio} /> : null}
      <Flash success={query.success} error={query.error} />

      <section className="dispatcher-hero">
        <div>
          <span className="dispatcher-eyebrow">Consultant / Dispatcher workspace</span>
          <h1>Welcome back, {user.name} <span>👋</span></h1>
          <p>Manage assigned truckers, documents, invoices, payments and loads from one focused workspace.</p>
          <div className="dispatcher-hero-actions"><Link className="btn btn-primary" href="/consultant/truckers">View assigned truckers</Link><Link className="btn btn-secondary" href="/consultant/loads">Create a load</Link></div>
        </div>
        <div className="dispatcher-profile-summary">
          
          <small>{profile?.specialty || "Complete your specialty"}</small>
          <Link href="/consultant/profile">Edit profile →</Link>
        </div>
      </section>

      <section
        className="dispatcher-period-filter"
        aria-label="Dashboard reporting period"
      >
        <div>
          <span>Dashboard activity</span>
          <strong>{selectedPeriodLabel}</strong>
        </div>

        <nav className="dispatcher-period-tabs">
          <Link
            className={period === "week" ? "active" : ""}
            href="/consultant/dashboard?period=week"
          >
            This Week
          </Link>

          <Link
            className={period === "month" ? "active" : ""}
            href="/consultant/dashboard?period=month"
          >
            This Month
          </Link>

          <Link
            className={
              period === "six-months" ? "active" : ""
            }
            href="/consultant/dashboard?period=six-months"
          >
            Last 6 Months
          </Link>
        </nav>
      </section>

      <section className="dispatcher-kpi-grid">
        <article className="dispatcher-kpi"><span>Assigned truckers</span><strong>{assigned}</strong><small>{activeTruckers} active clients</small></article>
        <article className="dispatcher-kpi"><span>Pending invoices</span><strong>{pendingInvoices}</strong><small>{unpaidInvoices} unpaid / overdue</small></article>
        <article className="dispatcher-kpi">
          <span>Paid volume</span>
          <strong>{money(periodPaid._sum.amountCents || 0)}</strong>
          <small>
            {money(
              periodPaid._sum.dispatcherCommissionCents || 0
            )} earned commission
          </small>
        </article>
        <article className="dispatcher-kpi">
          <span>Loads created</span>
          <strong>{periodLoads}</strong>
          <small>{selectedPeriodLabel}</small>
        </article>
      </section>

      <div className="dispatcher-main-grid">
        <section className="dispatcher-panel dispatcher-progress-panel">
          <div className="dispatcher-panel-heading"><div><span>Client lifecycle</span><h2>Dispatcher workflow</h2></div><Link href="/consultant/leads">Open workflow</Link></div>
          <div className="dispatcher-stage-grid">{stages.map(([label, value], index) => <div className="dispatcher-stage" key={label}><i>{index + 1}</i><span>{label}</span><strong>{value}</strong></div>)}</div>
        </section>
        <section className="dispatcher-panel dispatcher-attention-panel">
          <div className="dispatcher-panel-heading"><div><span>Attention needed</span><h2>Operational alerts</h2></div></div>
          <Link href="/consultant/documents"><b>{missingDocs}</b><span>Missing or action-required documents</span></Link>
          <Link href="/consultant/invoices"><b>{unpaidInvoices}</b><span>Unpaid or overdue invoices</span></Link>
          <Link href="/consultant/chat"><b>{Math.max(assigned - contacted, 0)}</b><span>Truckers awaiting two-sided contact</span></Link>
        </section>
      </div>

      <section className="dispatcher-panel" style={{ marginTop: 18 }}>
        <div className="dispatcher-panel-heading"><div><span>Recent activity</span><h2>Latest assigned truckers</h2></div><Link href="/consultant/truckers">View all</Link></div>
        <div className="dispatcher-trucker-list">
          {latest.map((lead) => <article key={lead.id}>
            <div className="dispatcher-avatar">{lead.trucker.user.name.slice(0,1).toUpperCase()}</div>
            <div className="dispatcher-trucker-main"><strong>{lead.trucker.user.name}</strong><span>{lead.trucker.companyName || "No company"} · {lead.trucker.equipmentType || "Equipment pending"}</span></div>
            <StatusBadge value={lead.currentStatus} />
            <div className="dispatcher-trucker-invoice"><span>Latest invoice</span><strong>{lead.trucker.invoices[0]?.status.replaceAll("_", " ") || "None"}</strong></div>
            <div className="dispatcher-trucker-date"><span>Updated</span><strong>{dateTime(lead.updatedAt)}</strong></div>
            <div className="actions"><Link className="btn btn-secondary btn-sm" href={`/consultant/leads?trucker=${lead.truckerId}`}>Open</Link>{lead.trucker.conversations[0] ? <Link className="btn btn-primary btn-sm" href={`/consultant/chat?conversation=${lead.trucker.conversations[0].id}`}>Chat</Link> : null}</div>
          </article>)}
          {!latest.length ? <div className="empty">No assigned truckers yet.</div> : null}
        </div>
      </section>

      <section className="dispatcher-quick-grid">
        <Link href="/consultant/chat"><span>Chat</span><strong>Message assigned truckers</strong><b>→</b></Link>
        <Link href="/consultant/documents"><span>Documents</span><strong>Review compliance files</strong><b>→</b></Link>
        <Link href="/consultant/invoices"><span>Invoices</span><strong>Create and track billing</strong><b>→</b></Link>
        <Link href="/consultant/loads"><span>Loads</span><strong>Manage load operations</strong><b>→</b></Link>
      </section>

      <div className="dispatcher-monthly-strip">
        <span>{selectedPeriodLabel}</span>
        <strong>
          {money(periodPaid._sum.amountCents || 0)} paid volume
        </strong>
        <strong>
          {money(
            periodPaid._sum.dispatcherCommissionCents || 0
          )} commission earned
        </strong>
        <strong>{periodLoads} loads created</strong>
      </div>
    </>
  );
}
