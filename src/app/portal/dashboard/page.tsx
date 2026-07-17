import Image from "next/image";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentChecklist } from "@/lib/required-documents";
import { Flash } from "@/components/flash";
import { dateTime, money } from "@/lib/utils";
import { TruckerProfilePopup } from "@/components/trucker-profile-popup";

const DAY = 24 * 60 * 60 * 1000;

type DashboardQuery = {
  success?: string;
  profileError?: string;
  period?: string;
  from?: string;
  to?: string;
};

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function validDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rangeFor(query: DashboardQuery) {
  const customFrom = validDate(query.from);
  const customTo = validDate(query.to);

  if (customFrom && customTo && customFrom <= customTo) {
    return {
      key: "custom",
      start: startOfDay(customFrom),
      end: endOfDay(customTo),
      days: Math.max(
        1,
        Math.round((customTo.getTime() - customFrom.getTime()) / DAY) + 1
      )
    };
  }

  const key =
    query.period === "month" || query.period === "six-months"
      ? query.period
      : "week";

  const days = key === "month" ? 30 : key === "six-months" ? 180 : 7;
  const end = endOfDay();
  const start = startOfDay(new Date(end.getTime() - (days - 1) * DAY));

  return { key, start, end, days };
}

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(value);
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`metric-trend ${positive ? "positive" : "negative"}`}>
      <span aria-hidden="true">{positive ? "↑" : "↓"}</span>
      {Math.abs(value).toFixed(1)}% <small>vs previous period</small>
    </span>
  );
}

function MetricIcon({ kind }: { kind: "revenue" | "loads" | "average" }) {
  if (kind === "loads") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  }

  if (kind === "average") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 3 7-8"/><path d="M15 6h5v5"/></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M17 6.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3"/></svg>;
}

function QuickIcon({ kind }: { kind: "chat" | "documents" | "invoices" }) {
  if (kind === "documents") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3z"/><path d="M7 13h10M7 16h7"/></svg>;
  }

  if (kind === "invoices") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A8 8 0 1 1 21 15Z"/></svg>;
}

export default async function TruckerDashboard({
  searchParams
}: {
  searchParams: Promise<DashboardQuery>;
}) {
  const user = await requireRole("TRUCKER");
  const query = await searchParams;
  const profile = user.truckerProfile!;
  const selectedRange = rangeFor(query);
  const previousEnd = new Date(selectedRange.start.getTime() - 1);
  const previousStart = startOfDay(
    new Date(previousEnd.getTime() - (selectedRange.days - 1) * DAY)
  );
  const today = startOfDay();

  const [
    full,
    equipmentCategories,
    checklist,
    todayActivity,
    currentLoadRevenue,
    currentLoadCount,
    previousLoadRevenue,
    previousLoadCount,
    dueInvoiceCount,
    dueInvoiceTotal
  ] = await Promise.all([
    db.truckerProfile.findUnique({
      where: { id: profile.id },
      include: {
        assignedConsultant: { include: { consultantProfile: true } },
        lead: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 6 },
        loads: { orderBy: { createdAt: "desc" }, take: 5 },
        documents: true,
        conversations: true
      }
    }),
    db.equipmentCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, commissionBps: true }
    }),
    documentChecklist(profile.id),
    db.auditLog.findMany({
      where: { actorId: user.id, createdAt: { gte: today } },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    db.load.aggregate({
      where: { truckerId: profile.id, createdAt: { gte: selectedRange.start, lte: selectedRange.end } },
      _sum: { rateCents: true }
    }),
    db.load.count({
      where: { truckerId: profile.id, createdAt: { gte: selectedRange.start, lte: selectedRange.end } }
    }),
    db.load.aggregate({
      where: { truckerId: profile.id, createdAt: { gte: previousStart, lte: previousEnd } },
      _sum: { rateCents: true }
    }),
    db.load.count({
      where: { truckerId: profile.id, createdAt: { gte: previousStart, lte: previousEnd } }
    }),
    db.invoice.count({
      where: { truckerId: profile.id, status: { in: ["SENT", "VIEWED", "UNPAID", "OVERDUE"] } }
    }),
    db.invoice.aggregate({
      where: { truckerId: profile.id, status: { in: ["SENT", "VIEWED", "UNPAID", "OVERDUE"] } },
      _sum: { amountCents: true }
    })
  ]);

  if (!full) return null;

  const missingDocuments = checklist.filter((item) => !item.complete).length;
  const revenueCents = currentLoadRevenue._sum.rateCents || 0;
  const previousRevenueCents = previousLoadRevenue._sum.rateCents || 0;
  const averageLoadCents = currentLoadCount ? Math.round(revenueCents / currentLoadCount) : 0;
  const previousAverageCents = previousLoadCount ? Math.round(previousRevenueCents / previousLoadCount) : 0;
  const contactComplete = full.conversations.some((conversation) => conversation.twoSidedContactValidated);
  const documentsComplete = missingDocuments === 0;
  const activeComplete = profile.accountStatus === "ACTIVE";
  const latestLoad = full.loads[0];

  const journey = [
    { label: "Signup", state: "Complete", complete: true, current: false, href: "/portal/profile" },
    { label: "Contact", state: contactComplete ? "Complete" : "Pending", complete: contactComplete, current: !contactComplete, href: "/portal/chat" },
    { label: "Documents", state: documentsComplete ? "Complete" : "In Progress", complete: documentsComplete, current: contactComplete && !documentsComplete, href: "/portal/documents" },
    { label: "Active", state: activeComplete ? "Complete" : "Upcoming", complete: activeComplete, current: documentsComplete && !activeComplete, href: "/portal/payments?view=due" }
  ];

  return (
    <>
      <style>{`
        .trucker-dashboard-hero { position: relative; overflow: visible; }
        .dashboard-range-controls { position: relative; z-index: 30; }
        .dashboard-date-filter { position: relative; z-index: 40; }
        .dashboard-date-filter[open] { z-index: 200; }
        .dashboard-date-popover { z-index: 210; }
        .dashboard-metric-grid { position: relative; z-index: 1; }
        .premium-dispatcher-card-compact { position: relative; z-index: 10; margin: 18px 0 22px; padding: 16px 18px; }
        .premium-dispatcher-card-compact .dispatcher-card-content { display: flex; align-items: center; gap: 14px; }
        .premium-dispatcher-card-compact .dispatcher-portrait-wrap { flex: 0 0 auto; }
        .premium-dispatcher-card-compact .dispatcher-portrait { width: 58px; height: 58px; border-radius: 50%; object-fit: cover; }
        .premium-dispatcher-card-compact .dispatcher-details { flex: 1; min-width: 0; }
        .premium-dispatcher-card-compact .dispatcher-details h3 { margin: 2px 0 5px; font-size: 1rem; }
        .dispatcher-small-label { display: block; color: #8aa8d6; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
        .premium-dispatcher-card-compact .dispatcher-availability { font-size: .8rem; }
        .premium-dispatcher-card-compact .dispatcher-chat-button { flex: 0 0 auto; min-width: 92px; padding: 10px 14px; }
        @media (max-width: 768px) {
          .trucker-dashboard-hero { height: auto !important; min-height: 0 !important; overflow: visible !important; padding-bottom: 20px; }
          .dashboard-range-controls { position: relative !important; width: 100%; margin-top: 22px; margin-bottom: 18px; z-index: 30; }
          .range-tabs { width: 100%; }
          .dashboard-date-filter { position: relative !important; width: 100%; margin-top: 14px; margin-bottom: 0; z-index: 40; }
          .dashboard-date-filter summary { width: 100%; min-height: 58px; }
          .dashboard-date-popover { position: absolute; top: calc(100% + 8px); left: 0; right: 0; width: 100%; }
          .premium-dispatcher-card-compact { margin: 14px 0 20px; padding: 14px; }
          .premium-dispatcher-card-compact .dispatcher-card-content { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
          .premium-dispatcher-card-compact .dispatcher-portrait { width: 50px; height: 50px; }
          .premium-dispatcher-card-compact .dispatcher-chat-button { min-width: auto; padding: 9px 12px; }
          .premium-dispatcher-card-compact .dispatcher-chat-button svg { width: 18px; height: 18px; }
        }
        @media (max-width: 430px) {
          .premium-dispatcher-card-compact .dispatcher-card-content { grid-template-columns: 46px minmax(0, 1fr); }
          .premium-dispatcher-card-compact .dispatcher-chat-button { grid-column: 1 / -1; width: 100%; justify-content: center; }
          .premium-dispatcher-card-compact .dispatcher-portrait { width: 46px; height: 46px; }
        }
      `}</style>

      {!profile.profileCompletedAt ? (
        <TruckerProfilePopup
          name={user.name}
          email={user.email}
          phone={user.phone}
          error={query.profileError}
          equipmentOptions={equipmentCategories}
        />
      ) : null}

      <Flash success={query.success} />

      <section className="trucker-dashboard-hero">
        <div className="trucker-hero-copy">
          <span className="trucker-hero-kicker">Trucker Portal</span>
          <h1>Welcome, {user.name.split(" ")[0]} <span aria-hidden="true">👋</span></h1>
          <p>Let&apos;s keep your business moving.</p>
          <span className={`account-status-pill ${activeComplete ? "active" : "onboarding"}`}>
            {activeComplete ? "Active client" : "Account setup in progress"}
          </span>
        </div>

        <div className="dashboard-range-controls">
          <div className="range-tabs" aria-label="Dashboard period">
            <Link className={selectedRange.key === "week" ? "active" : ""} href="?period=week">This Week</Link>
            <Link className={selectedRange.key === "month" ? "active" : ""} href="?period=month">Month</Link>
            <Link className={selectedRange.key === "six-months" ? "active" : ""} href="?period=six-months">Last 6 Months</Link>
          </div>

          <details className="dashboard-date-filter dashboard-date-filter-fix">
            <summary>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
              <span>{shortDate(selectedRange.start)} – {shortDate(selectedRange.end)}</span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <form className="dashboard-date-popover" method="get">
              <label>From<input type="date" name="from" defaultValue={query.from} /></label>
              <label>To<input type="date" name="to" defaultValue={query.to} /></label>
              <button className="btn btn-primary btn-sm" type="submit">Apply dates</button>
            </form>
          </details>
        </div>
      </section>

      {full.assignedConsultant ? (
        <section className="premium-dispatcher-card premium-dispatcher-card-compact">
          <div className="dispatcher-card-content">
            <div className="dispatcher-portrait-wrap">
              <Image
                className="dispatcher-portrait"
                src="/images/dispatcher-avatar.webp"
                alt={`${full.assignedConsultant.name}, assigned dispatcher`}
                width={72}
                height={72}
                priority
              />
              <span className="dispatcher-online-dot" aria-label="Available for portal chat" />
            </div>

            <div className="dispatcher-details">
              <span className="dispatcher-small-label">Your Dispatcher</span>
              <h3>{full.assignedConsultant.name}</h3>
              <span className="dispatcher-availability"><i /> Available for portal chat</span>
            </div>

            <Link className="dispatcher-chat-button" href="/portal/chat">
              <QuickIcon kind="chat" />
              Chat
            </Link>
          </div>
        </section>
      ) : (
        <div className="premium-empty-alert premium-dispatcher-card-compact">
          Your dispatcher will be assigned shortly.
        </div>
      )}

      <section className="dashboard-metric-grid" aria-label="Performance summary">
        <article className="dashboard-metric-card">
          <span className="dashboard-metric-icon revenue"><MetricIcon kind="revenue" /></span>
          <div>
            <span className="dashboard-metric-label">Revenue Generated</span>
            <strong>{money(revenueCents)}</strong>
            <Trend value={percentageChange(revenueCents, previousRevenueCents)} />
          </div>
        </article>

        <article className="dashboard-metric-card">
          <span className="dashboard-metric-icon loads"><MetricIcon kind="loads" /></span>
          <div>
            <span className="dashboard-metric-label">Loads</span>
            <strong>{currentLoadCount}</strong>
            <Trend value={percentageChange(currentLoadCount, previousLoadCount)} />
          </div>
        </article>

        <article className="dashboard-metric-card">
          <span className="dashboard-metric-icon average"><MetricIcon kind="average" /></span>
          <div>
            <span className="dashboard-metric-label">Average Load Value</span>
            <strong>{money(averageLoadCents)}</strong>
            <Trend value={percentageChange(averageLoadCents, previousAverageCents)} />
          </div>
        </article>
      </section>

      <section className="trucker-journey-card" aria-label="Account progress">
        {journey.map((step, index) => (
          <div className="journey-segment" key={step.label}>
            <Link className={`journey-step ${step.complete ? "complete" : ""} ${step.current ? "current" : ""}`} href={step.href}>
              <span className="journey-icon" aria-hidden="true">
                {step.complete ? "✓" : index === 1 ? "●" : index === 2 ? "▤" : "⚑"}
              </span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.state}</small>
              </span>
            </Link>
            {index < journey.length - 1 ? <span className={`journey-line ${step.complete ? "complete" : ""}`} /> : null}
          </div>
        ))}
      </section>

      <section className="dashboard-quick-grid">
        <Link className="dashboard-quick-card chat" href="/portal/chat">
          <span className="quick-icon"><QuickIcon kind="chat" /></span>
          <span><strong>Chat</strong><small>Message your dispatcher</small></span>
          <b aria-hidden="true">›</b>
        </Link>
        <Link className="dashboard-quick-card documents" href="/portal/documents">
          <span className="quick-icon"><QuickIcon kind="documents" /></span>
          <span><strong>Documents</strong><small>{missingDocuments ? `${missingDocuments} mandatory file${missingDocuments === 1 ? "" : "s"} missing` : "All mandatory documents complete"}</small></span>
          <b aria-hidden="true">›</b>
        </Link>
        <Link className="dashboard-quick-card invoices" href="/portal/invoices">
          <span className="quick-icon"><QuickIcon kind="invoices" /></span>
          <span><strong>Invoices</strong><small>{dueInvoiceCount ? `${dueInvoiceCount} due · ${money(dueInvoiceTotal._sum.amountCents || 0)}` : "No due invoices"}</small></span>
          <b aria-hidden="true">›</b>
        </Link>
      </section>

      <section className="dashboard-lower-grid">
        <article className="soft-dashboard-panel">
          <div className="soft-panel-heading">
            <div><span>Today</span><h2>Recent Portal Activity</h2></div>
            <Link href="/portal/profile">View profile</Link>
          </div>
          <div className="premium-activity-list">
            {todayActivity.map((activity) => (
              <div key={activity.id}>
                <span className="activity-dot" />
                <p><strong>{activity.action.replaceAll("_", " ")}</strong><small>{dateTime(activity.createdAt)}</small></p>
              </div>
            ))}
            {!todayActivity.length ? <div className="premium-empty-state">No portal activity recorded today.</div> : null}
          </div>
        </article>

        <article className="soft-dashboard-panel">
          <div className="soft-panel-heading">
            <div><span>Current operation</span><h2>Trucker Snapshot</h2></div>
            <Link href="/portal/loads">View loads</Link>
          </div>
          <div className="snapshot-grid">
            <div><span>Company</span><strong>{profile.companyName || "Complete your profile"}</strong></div>
            <div><span>Equipment</span><strong>{profile.equipmentType || "Not provided"}</strong></div>
            <div><span>Package</span><strong>{profile.packageType || "Not provided"}</strong></div>
            <div><span>Latest load</span><strong>{latestLoad?.loadRef || "No load assigned"}</strong></div>
          </div>
        </article>
      </section>
    </>
  );
}