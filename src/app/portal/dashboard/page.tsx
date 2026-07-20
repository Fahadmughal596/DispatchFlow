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

function QuickIcon({ kind }: { kind: "chat" | "documents" | "invoices" | "revenue" }) {
  if (kind === "documents") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3z"/><path d="M7 13h10M7 16h7"/></svg>;
  }

  if (kind === "invoices") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>;
  }

  if (kind === "revenue") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M17 6.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3"/></svg>;
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
    dueInvoiceTotal,
    dispatcherCompletedRevenue,
    dispatcherCompletedLoads
  ] = await Promise.all([
    db.truckerProfile.findUnique({
      where: { id: profile.id },
      include: {
        assignedConsultant: { include: { consultantProfile: true, _count: { select: { createdLoads: true } } } },
        lead: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 6 },
        loads: { orderBy: { createdAt: "desc" }, take: 5 },
        documents: true,
        conversations: true,
        agreements: { orderBy: { createdAt: "desc" }, take: 1 },
        payments: { orderBy: { createdAt: "desc" }, take: 1 }
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
    }),
    db.load.aggregate({
      where: { consultantId: profile.assignedConsultantId || -1, status: "COMPLETED" },
      _sum: { rateCents: true }
    }),
    db.load.count({
      where: { consultantId: profile.assignedConsultantId || -1, status: "COMPLETED" }
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
  const dispatcher = full.assignedConsultant;
  const dispatcherProfile = dispatcher?.consultantProfile;
  const dispatcherOnline = Boolean(
    dispatcher?.lastLoginAt && Date.now() - dispatcher.lastLoginAt.getTime() <= 15 * 60 * 1000
  );
  const dispatcherStatus = dispatcherProfile?.isPaused || dispatcher?.status === "PAUSED"
    ? "Paused"
    : dispatcher?.status === "DISABLED"
      ? "Disabled"
      : dispatcherOnline
        ? "Online"
        : "Active";
  const dispatcherTotalLoads = (dispatcherProfile?.initialLoadCount || 0) + (dispatcher?._count.createdLoads || 0);
  const dispatcherPastRevenueCents = (dispatcherProfile?.pastRevenueCents || 0) + (dispatcherCompletedRevenue._sum.rateCents || 0);
  const dispatcherAverageRevenueCents = dispatcherCompletedLoads ? Math.round((dispatcherCompletedRevenue._sum.rateCents || 0) / dispatcherCompletedLoads) : 0;
  const profileComplete = Boolean(profile.profileCompletedAt);
  const agreementComplete = Boolean(full.agreements[0]);
  const paymentComplete = Boolean(full.payments[0]);
  const firstLoadComplete = Boolean(full.loads.length);

  const journey = [
    { label: "Signup", state: "Complete", complete: true, current: false, href: "/portal/profile" },
    { label: "Contact", state: contactComplete ? "Complete" : "Pending", complete: contactComplete, current: !contactComplete, href: "/portal/chat" },
    { label: "Documents", state: documentsComplete ? "Complete" : "In Progress", complete: documentsComplete, current: contactComplete && !documentsComplete, href: "/portal/documents" },
    { label: "Active", state: activeComplete ? "Complete" : "Upcoming", complete: activeComplete, current: documentsComplete && !activeComplete, href: "/portal/payments?view=due" }
  ];

  return (
    <>
      <style>{`
        .trucker-dashboard-hero { position:relative; overflow:visible; }
        .dashboard-filter-row { display:flex; justify-content:space-between; align-items:center; gap:16px; margin:0 0 20px; position:relative; z-index:30; }
        .dashboard-range-controls { display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; }
        .dashboard-date-filter { position:relative; z-index:40; }
        .dashboard-date-filter[open] { z-index:200; }
        .dashboard-date-popover { z-index:210; }
        .dashboard-metric-grid { position:relative; z-index:1; }
        .premium-dispatcher-card-compact { position:relative; z-index:10; margin:22px 0 18px; padding:22px 24px; border:1px solid rgba(116,157,216,.17); border-radius:17px; background:linear-gradient(145deg,rgba(8,23,49,.99),rgba(3,14,32,.97)); box-shadow:0 18px 45px rgba(0,0,0,.18); }
        .dispatcher-card-content { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:18px; align-items:center; }
        .dispatcher-icon-wrap { position:relative; width:64px; height:64px; display:grid; place-items:center; border-radius:50%; background:radial-gradient(circle at 35% 30%,rgba(24,134,255,.32),rgba(5,44,138,.55)); color:#36a0ff; border:1px solid rgba(24,134,255,.35); box-shadow:0 0 28px rgba(24,134,255,.16); }
        .dispatcher-icon-wrap svg { width:31px; height:31px; fill:none; stroke:currentColor; stroke-width:1.8; }
        .dispatcher-online-dot { position:absolute; right:1px; bottom:3px; width:14px; height:14px; border-radius:50%; background:#22d56a; border:3px solid #07152d; box-shadow:0 0 0 3px rgba(34,213,106,.14); }
        .dispatcher-details h3 { margin:3px 0 14px; font-size:1.5rem; line-height:1.2; color:#f7fbff; letter-spacing:-.02em; }
        .dispatcher-small-label { display:block; color:#2f8cff; font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
        .dispatcher-profile-grid { display:grid; grid-template-columns:repeat(5,minmax(105px,1fr)); gap:10px; }
        .dispatcher-profile-grid div { min-width:0; }
        .dispatcher-profile-grid span { display:block; color:#7f91ad; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .dispatcher-profile-grid strong { display:block; margin-top:4px; color:#eaf2ff; font-size:.84rem; overflow-wrap:anywhere; }
        .dispatcher-chat-button { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-width:100px; }
        .dispatcher-chat-button svg { width:18px; height:18px; }

        .premium-dispatcher-card-compact { border-color:rgba(45,156,255,.45); background:linear-gradient(135deg,rgba(7,31,72,.98),rgba(4,18,42,.98)); box-shadow:0 24px 70px rgba(0,73,170,.24), inset 0 0 0 1px rgba(74,174,255,.08); }
        .premium-dispatcher-card-compact::before { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:radial-gradient(circle at 15% 10%,rgba(39,145,255,.17),transparent 38%); }
        .dispatcher-details, .dispatcher-icon-wrap, .dispatcher-chat-button { position:relative; z-index:1; }
        .dashboard-quick-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .dashboard-quick-card.revenue { border-color:rgba(32,196,124,.3); background:linear-gradient(145deg,rgba(5,52,46,.88),rgba(4,25,35,.95)); }
        .dashboard-quick-card.revenue .quick-icon { color:#31d398; background:rgba(49,211,152,.12); }
        .checkpoint-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:22px 0; }
        .checkpoint-card { display:flex; flex-direction:column; gap:12px; min-height:190px; padding:20px; border:1px solid rgba(116,157,216,.18); border-radius:17px; background:linear-gradient(145deg,rgba(8,23,49,.97),rgba(3,14,32,.96)); }
        .checkpoint-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .checkpoint-number { display:grid; place-items:center; width:34px; height:34px; border-radius:50%; background:rgba(40,128,255,.13); color:#59a9ff; font-weight:900; }
        .checkpoint-status { font-size:.72rem; font-weight:800; padding:6px 9px; border-radius:999px; background:rgba(245,158,11,.12); color:#f7b955; }
        .checkpoint-card.complete .checkpoint-status { background:rgba(34,197,94,.12); color:#49d985; }
        .checkpoint-card h3 { margin:0; color:#f7fbff; font-size:1rem; }
        .checkpoint-card p { margin:0; color:#8fa0bb; font-size:.84rem; line-height:1.55; flex:1; }
        .checkpoint-card .btn { width:100%; }
        @media (max-width:980px) {
          .dashboard-quick-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .checkpoint-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .dispatcher-profile-grid { grid-template-columns:repeat(3,minmax(110px,1fr)); }
        }
        @media (max-width:768px) {
          .trucker-dashboard-hero { height:auto !important; min-height:0 !important; padding-bottom:14px; }
          .dispatcher-card-content { grid-template-columns:52px minmax(0,1fr); }
          .dispatcher-icon-wrap { width:52px; height:52px; }
          .dispatcher-chat-button { grid-column:1/-1; width:100%; }
          .dispatcher-profile-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .dashboard-filter-row, .dashboard-range-controls { flex-direction:column; align-items:stretch; }
          .range-tabs { width:100%; }
          .dashboard-date-filter, .dashboard-date-filter summary { width:100%; }
          .dashboard-date-popover { left:0; right:0; width:100%; }
          .dashboard-quick-grid, .checkpoint-grid { grid-template-columns:1fr; }
        }
        @media (max-width:430px) {
          .dispatcher-profile-grid { grid-template-columns:1fr; }
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

      </section>

      {dispatcher ? (
        <section className="premium-dispatcher-card premium-dispatcher-card-compact">
          <div className="dispatcher-card-content">
            <div className="dispatcher-icon-wrap" aria-label="Assigned dispatcher">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              {dispatcherOnline ? <span className="dispatcher-online-dot" aria-label="Dispatcher online" /> : null}
            </div>

            <div className="dispatcher-details">
              <span className="dispatcher-small-label">Your Assigned Dispatcher</span>
              <h3>{dispatcher.name}</h3>
              <div className="dispatcher-profile-grid">
                <div><span>Expertise</span><strong>{dispatcherProfile?.specialty || "Not provided"}</strong></div>
                <div><span>Contact Number</span><strong>{dispatcherProfile?.phone || dispatcher.phone || "Not provided"}</strong></div>
                <div><span>Status</span><strong>{dispatcherStatus}</strong></div>
                <div><span>Total Loads</span><strong>{dispatcherTotalLoads}</strong></div>
                <div><span>Service Duration</span><strong>{dispatcherProfile?.serviceDuration || "Not provided"}</strong></div>
              </div>
            </div>

            <Link className="dispatcher-chat-button btn btn-primary" href="/portal/chat">
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

      <section className="dashboard-filter-row" aria-label="Dashboard filters">
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
        <article className="dashboard-quick-card revenue">
          <span className="quick-icon"><QuickIcon kind="revenue" /></span>
          <span><strong>Dispatcher Past Revenue</strong><small>{money(dispatcherPastRevenueCents)} · {dispatcherCompletedLoads} completed loads · {money(dispatcherAverageRevenueCents)} avg</small></span>
          <b aria-hidden="true">✓</b>
        </article>
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


      <section className="checkpoint-grid" aria-label="Account checkpoints">
        {[
          { title: "Complete Profile", description: "Add personal, company and equipment details so your dispatcher can work with accurate information.", complete: profileComplete, href: "/portal/profile", action: "Open Profile" },
          { title: "Contact Dispatcher", description: "Start a two-way conversation and confirm how you prefer to communicate about loads.", complete: contactComplete, href: "/portal/chat", action: "Open Chat" },
          { title: "Upload Documents", description: missingDocuments ? `${missingDocuments} required document${missingDocuments === 1 ? " is" : "s are"} still missing.` : "All required documents are uploaded and ready for review.", complete: documentsComplete, href: "/portal/documents", action: "Manage Documents" },
          { title: "Sign Agreement", description: "Review and acknowledge your service agreement before activation.", complete: agreementComplete, href: "/portal/agreement", action: "Open Agreement" },
          { title: "Complete Payment", description: dueInvoiceCount ? `${dueInvoiceCount} due invoice${dueInvoiceCount === 1 ? "" : "s"} require attention.` : "No due invoice is currently blocking your account.", complete: paymentComplete || dueInvoiceCount === 0, href: "/portal/payments?view=due", action: "View Payments" },
          { title: "First Load", description: firstLoadComplete ? "Your load activity has started. Track current and completed loads here." : "Your first assigned load will appear once onboarding is complete.", complete: firstLoadComplete, href: "/portal/loads", action: "View Loads" }
        ].map((checkpoint, index) => (
          <article className={`checkpoint-card ${checkpoint.complete ? "complete" : ""}`} key={checkpoint.title}>
            <div className="checkpoint-top"><span className="checkpoint-number">{checkpoint.complete ? "✓" : index + 1}</span><span className="checkpoint-status">{checkpoint.complete ? "Complete" : "Action Required"}</span></div>
            <h3>{checkpoint.title}</h3>
            <p>{checkpoint.description}</p>
            <Link className="btn btn-secondary btn-sm" href={checkpoint.href}>{checkpoint.action}</Link>
          </article>
        ))}
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