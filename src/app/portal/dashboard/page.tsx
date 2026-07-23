import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentChecklist } from "@/lib/required-documents";
import { Flash } from "@/components/flash";
import { dateTime, money } from "@/lib/utils";

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
    checklist,
    todayActivity,
    currentLoadRevenue,
    currentLoadCount,
    previousLoadRevenue,
    previousLoadCount,
    dueInvoiceCount,
    dueInvoiceTotal,
    activeLoadCount,
    scheduledLoadCount,
    deliveredLoadCount
  ] = await Promise.all([
    db.truckerProfile.findUnique({
      where: { id: profile.id },
      include: {
        assignedConsultant: { include: { consultantProfile: true, _count: { select: { createdLoads: true } } } },
        lead: {
          include: {
            histories: {
              orderBy: { createdAt: "asc" }
            }
          }
        },
        invoices: { orderBy: { createdAt: "desc" }, take: 6 },
        loads: { orderBy: { createdAt: "desc" }, take: 5 },
        documents: true,
        conversations: true
      }
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
    db.load.count({
      where: {
        truckerId: profile.id,
        status: { in: ["PICKED_UP", "IN_TRANSIT"] }
      }
    }),
    db.load.count({
      where: {
        truckerId: profile.id,
        status: {
          in: ["DRAFT", "OFFERED", "ASSIGNED", "BOOKED", "DOCS_PENDING"]
        }
      }
    }),
    db.load.count({
      where: {
        truckerId: profile.id,
        status: { in: ["DELIVERED", "DROPPED_OFF", "COMPLETED"] }
      }
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
  const dispatcherPastRevenueCents = 0;
const journey = [
    { label: "Signup", state: "Complete", complete: true, current: false, href: "/portal/profile" },
    { label: "Contact", state: contactComplete ? "Complete" : "Pending", complete: contactComplete, current: !contactComplete, href: "/portal/chat" },
    { label: "Documents", state: documentsComplete ? "Complete" : "In Progress", complete: documentsComplete, current: contactComplete && !documentsComplete, href: "/portal/documents" },
    { label: "Active", state: activeComplete ? "Complete" : "Upcoming", complete: activeComplete, current: documentsComplete && !activeComplete, href: "/portal/invoices?view=due" }
  ];

  return (
    <>
      <style>{`
        .trucker-dashboard-hero { position:relative; overflow:visible; }
        .dashboard-filter-row {
          display:block;
          width:100%;
          margin:0 0 24px;
          position:relative;
          z-index:30;
        }
        .dashboard-range-controls {
          position:static !important;
          inset:auto !important;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          width:100%;
        }
        .dashboard-range-controls .range-tabs {
          flex:0 1 520px;
          width:min(100%,520px);
        }
        .dashboard-range-controls .range-tabs a {
          flex:1 1 0;
          min-width:0;
          white-space:nowrap;
        }
        .dashboard-date-filter { position:relative; z-index:40; flex:0 0 auto; min-width:220px; }
        .dashboard-date-filter > summary { justify-content:space-between; width:100%; }
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

        .invoice-payment-required {
          position:relative;
          display:grid;
          grid-template-columns:48px minmax(0,1fr) auto;
          gap:15px;
          align-items:center;
          margin:18px 0 22px;
          padding:18px 20px;
          overflow:hidden;
          border:1px solid rgba(255,174,67,.42);
          border-radius:16px;
          background:
            radial-gradient(circle at 0% 50%,rgba(255,164,46,.17),transparent 34%),
            linear-gradient(135deg,rgba(68,38,7,.72),rgba(28,22,18,.94));
          box-shadow:0 16px 38px rgba(0,0,0,.18);
        }

        .invoice-payment-required::before {
          content:"";
          position:absolute;
          inset:0 auto 0 0;
          width:4px;
          background:linear-gradient(#ffbe55,#ff7d21);
        }

        .invoice-payment-icon {
          width:44px;
          height:44px;
          display:grid;
          place-items:center;
          border-radius:12px;
          color:#fff;
          background:linear-gradient(135deg,#ffad32,#ff7420);
          box-shadow:0 10px 24px rgba(255,126,32,.24);
          font-size:1.2rem;
          font-weight:900;
        }

        .invoice-payment-copy strong {
          display:block;
          color:#fff7ea;
          font-size:.96rem;
        }

        .invoice-payment-copy span {
          display:block;
          margin-top:4px;
          color:#c9bda9;
          font-size:.78rem;
          line-height:1.5;
        }

        .invoice-payment-required .btn {
          white-space:nowrap;
        }

        @media (max-width:640px) {
          .invoice-payment-required {
            grid-template-columns:44px minmax(0,1fr);
          }

          .invoice-payment-required .btn {
            grid-column:1/-1;
            width:100%;
          }
        }

        .trucker-lead-card {
          margin:18px 0 24px;
          padding:20px 22px;
          border:1px solid rgba(60,144,246,.22);
          border-radius:17px;
          background:
            radial-gradient(circle at 0% 0%,rgba(47,140,255,.13),transparent 35%),
            linear-gradient(145deg,rgba(8,28,61,.98),rgba(4,18,41,.98));
          box-shadow:0 18px 42px rgba(0,0,0,.17);
        }

        .trucker-lead-header {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:18px;
          margin-bottom:20px;
        }

        .trucker-lead-header span {
          display:block;
          color:#2f8cff;
          font-size:.68rem;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.09em;
        }

        .trucker-lead-header h2 {
          margin:5px 0 0;
          color:#f7fbff;
          font-size:1.15rem;
        }

        .trucker-lead-status-badge {
          display:inline-flex;
          align-items:center;
          min-height:34px;
          padding:7px 12px;
          border:1px solid rgba(54,161,255,.3);
          border-radius:999px;
          color:#d9eeff;
          background:rgba(31,116,229,.16);
          font-size:.73rem;
          font-weight:800;
          white-space:nowrap;
        }

        .trucker-lead-meta {
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
          margin-bottom:20px;
        }

        .trucker-lead-meta div {
          padding:12px 13px;
          border:1px solid rgba(108,147,199,.13);
          border-radius:12px;
          background:rgba(3,15,35,.48);
        }

        .trucker-lead-meta span {
          display:block;
          color:#7f91ad;
          font-size:.65rem;
          font-weight:750;
          text-transform:uppercase;
          letter-spacing:.05em;
        }

        .trucker-lead-meta strong {
          display:block;
          margin-top:5px;
          color:#edf5ff;
          font-size:.82rem;
          overflow-wrap:anywhere;
        }

        .trucker-lead-timeline {
          display:grid;
          grid-template-columns:repeat(7,minmax(0,1fr));
          gap:8px;
        }

        .trucker-lead-step {
          position:relative;
          min-width:0;
          padding:11px 9px;
          border:1px solid rgba(103,135,180,.14);
          border-radius:11px;
          background:rgba(3,14,32,.54);
          text-align:center;
        }

        .trucker-lead-step i {
          width:25px;
          height:25px;
          display:grid;
          place-items:center;
          margin:0 auto 7px;
          border-radius:50%;
          background:#142a4d;
          color:#7d94b7;
          font-style:normal;
          font-size:.68rem;
          font-weight:900;
        }

        .trucker-lead-step span {
          display:block;
          color:#8092ae;
          font-size:.63rem;
          font-weight:700;
          line-height:1.35;
        }

        .trucker-lead-step.complete {
          border-color:rgba(31,184,107,.22);
          background:rgba(12,84,52,.14);
        }

        .trucker-lead-step.complete i {
          color:#dffff0;
          background:#15935a;
        }

        .trucker-lead-step.current {
          border-color:rgba(43,139,255,.42);
          background:rgba(25,104,218,.16);
          box-shadow:0 8px 22px rgba(18,102,223,.12);
        }

        .trucker-lead-step.current i {
          color:#fff;
          background:#1f7be7;
        }

        .trucker-lead-step.current span {
          color:#dcecff;
        }

        @media (max-width:980px) {
          .trucker-lead-meta {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }

          .trucker-lead-timeline {
            grid-template-columns:repeat(4,minmax(0,1fr));
          }
        }

        @media (max-width:640px) {
          .trucker-lead-header {
            flex-direction:column;
          }

          .trucker-lead-meta {
            grid-template-columns:1fr;
          }

          .trucker-lead-timeline {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        .dashboard-section-intro { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin:26px 0 12px; }
        .dashboard-section-intro h2 { margin:0; font-size:1.15rem; color:#f7fbff; }
        .dashboard-section-intro p { margin:5px 0 0; max-width:760px; color:#8fa1b8; font-size:.82rem; line-height:1.55; }
        .dashboard-section-kicker { display:block; margin-bottom:5px; color:#2f8cff; font-size:.68rem; font-weight:800; text-transform:uppercase; letter-spacing:.1em; }
        .dashboard-card-help { display:block; margin-top:5px; color:#7f91ad; font-size:.72rem; line-height:1.45; }
        .dispatcher-purpose { margin:0 0 14px; color:#9eb0c8; font-size:.8rem; line-height:1.55; }
        .dispatcher-profile-grid { grid-template-columns:repeat(6,minmax(105px,1fr)); }

        @media (max-width:980px) {
          .dispatcher-profile-grid { grid-template-columns:repeat(3,minmax(110px,1fr)); }
        }
        @media (max-width:768px) {
          .trucker-dashboard-hero { height:auto !important; min-height:0 !important; padding-bottom:14px; }
          .dispatcher-card-content { grid-template-columns:52px minmax(0,1fr); }
          .dispatcher-icon-wrap { width:52px; height:52px; }
          .dispatcher-chat-button { grid-column:1/-1; width:100%; }
          .dispatcher-profile-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .dashboard-range-controls { flex-direction:column; align-items:stretch; }
          .dashboard-range-controls .range-tabs { width:100%; max-width:none; }
          .dashboard-date-filter, .dashboard-date-filter summary { width:100%; min-width:0; }
          .dashboard-date-popover { left:0; right:0; width:100%; }
        }
        @media (max-width:430px) {
          .dispatcher-profile-grid { grid-template-columns:1fr; }
        }

        .trucker-load-status-grid {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:16px;
          margin:18px 0 24px;
        }

        .trucker-load-status-card {
          min-height:126px;
          display:grid;
          grid-template-columns:54px minmax(0,1fr) auto;
          gap:15px;
          align-items:center;
          padding:20px;
          border:1px solid rgba(103,148,214,.18);
          border-radius:17px;
          background:linear-gradient(145deg,rgba(8,25,53,.98),rgba(3,15,34,.97));
          box-shadow:0 16px 40px rgba(0,0,0,.17);
        }

        .load-status-icon {
          width:54px;
          height:54px;
          display:grid;
          place-items:center;
          border-radius:15px;
        }

        .load-status-icon svg {
          width:28px;
          height:28px;
          fill:none;
          stroke:currentColor;
          stroke-width:1.8;
          stroke-linecap:round;
          stroke-linejoin:round;
        }

        .trucker-load-status-card.active .load-status-icon {
          color:#e5fff1;
          background:linear-gradient(145deg,#168b55,#0b5633);
        }

        .trucker-load-status-card.scheduled .load-status-icon {
          color:#edf6ff;
          background:linear-gradient(145deg,#147df0,#084a9d);
        }

        .trucker-load-status-card.delivered .load-status-icon {
          color:#fff4e9;
          background:linear-gradient(145deg,#ff9949,#c95a13);
        }

        .load-status-copy span,
        .load-status-copy strong,
        .load-status-copy small {
          display:block;
        }

        .load-status-copy > span {
          color:#8fa1b8;
          font-size:.67rem;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.07em;
        }

        .load-status-copy strong {
          margin-top:5px;
          color:#f4f8ff;
          font-size:1rem;
        }

        .load-status-copy small {
          margin-top:5px;
          color:#7f90a8;
          font-size:.7rem;
          line-height:1.4;
        }

        .load-status-count {
          color:#fff;
          font-size:2rem;
          font-weight:850;
        }

        @media (max-width:900px) {
          .trucker-load-status-grid {
            grid-template-columns:1fr;
          }

          .trucker-load-status-card {
            min-height:106px;
          }
        }

        @media (max-width:430px) {
          .trucker-load-status-card {
            grid-template-columns:46px minmax(0,1fr) auto;
            gap:11px;
            padding:15px;
          }

          .load-status-icon {
            width:46px;
            height:46px;
          }

          .load-status-count {
            font-size:1.65rem;
          }
        }

      `}</style>

      <Flash success={query.success} />

      <section className="trucker-dashboard-hero">
        <div className="trucker-hero-copy">
          <span className="trucker-hero-kicker">Trucker Portal</span>
          <h1>Welcome, {(user.username || user.name).split(" ")[0]} <span aria-hidden="true">👋</span></h1>
          <p>Track your dispatcher, business performance, onboarding progress, and daily portal activity from one place.</p>
          <span className={`account-status-pill ${activeComplete ? "active" : "onboarding"}`}>
            {activeComplete ? "Active" : "Account setup in progress"}
          </span>
        </div>

      </section>

      <section
        className="trucker-load-status-grid"
        aria-label="Load status overview"
      >
        <Link
          className="trucker-load-status-card active"
          href="/portal/loads?status=active"
        >
          <span className="load-status-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 7h11v9H3z" />
              <path d="M14 10h4l3 3v3h-7z" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
          </span>

          <span className="load-status-copy">
            <span>Current loads</span>
            <strong>Active Loads</strong>
            <small>Picked up or currently in transit.</small>
          </span>

          <strong className="load-status-count">
            {activeLoadCount}
          </strong>
        </Link>

        <Link
          className="trucker-load-status-card scheduled"
          href="/portal/loads?status=scheduled"
        >
          <span className="load-status-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
          </span>

          <span className="load-status-copy">
            <span>Upcoming and pending</span>
            <strong>Scheduled Loads</strong>
            <small>Booked, assigned, offered or awaiting action.</small>
          </span>

          <strong className="load-status-count">
            {scheduledLoadCount}
          </strong>
        </Link>

        <Link
          className="trucker-load-status-card delivered"
          href="/portal/loads?status=delivered"
        >
          <span className="load-status-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 12 9 17 20 6" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>

          <span className="load-status-copy">
            <span>Completed work</span>
            <strong>Delivered Loads</strong>
            <small>Delivered, dropped off or fully completed.</small>
          </span>

          <strong className="load-status-count">
            {deliveredLoadCount}
          </strong>
        </Link>
      </section>

      <div className="dashboard-section-intro">
        <div>
          <span className="dashboard-section-kicker">Your support team</span>
          <h2>Assigned Dispatcher</h2>
          <p>Your dispatcher manages load coordination, communication, and day-to-day dispatch support for your business.</p>
        </div>
      </div>

      {dispatcher ? (
        <section className="dispatcher-showcase-card" aria-label="Assigned dispatcher profile">
          <div className="dispatcher-showcase-main">
            <div className="dispatcher-showcase-avatar" aria-label="Assigned dispatcher">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              {dispatcherOnline ? <span className="dispatcher-online-dot" aria-label="Dispatcher online" /> : null}
            </div>

            <div className="dispatcher-showcase-identity">
              <span className="dispatcher-showcase-label">Your Dispatcher / Consultant / Copilot</span>
              <h3>{dispatcher.name}</h3>
              <p>Your dedicated contact for load coordination, rate support, paperwork, and daily dispatch communication.</p>
            </div>

            <Link className="dispatcher-showcase-chat" href="/portal/chat">
              <QuickIcon kind="chat" />
              <span>Chat</span>
            </Link>
          </div>

          <div className="dispatcher-showcase-stats">
            <div><span>Expertise</span><strong>{dispatcherProfile?.specialty || "Not provided"}</strong></div>
            <div><span>Contact Number</span><strong>{dispatcherProfile?.phone || dispatcher.phone || "Not provided"}</strong></div>
            <div><span>Status</span><strong>{dispatcherStatus}</strong></div>
            <div><span>Total Loads</span><strong>{dispatcherTotalLoads}</strong></div>
            <div><span>Service Duration</span><strong>{dispatcherProfile?.serviceDuration || "Not provided"}</strong></div>
            <div><span>Past Revenue</span><strong>{money(dispatcherPastRevenueCents)}</strong></div>
          </div>
        </section>
      ) : (
        <div className="premium-empty-alert dispatcher-showcase-card">
          Your dispatcher will be assigned shortly.
        </div>
      )}

      {dueInvoiceCount ? (
        <section
          className="invoice-payment-required"
          aria-label="Payment required"
        >
          <span className="invoice-payment-icon" aria-hidden="true">
            $
          </span>

          <div className="invoice-payment-copy">
            <strong>Payment Required</strong>
            <span>
              You have {dueInvoiceCount} unpaid invoice
              {dueInvoiceCount === 1 ? "" : "s"} totaling{" "}
              {money(dueInvoiceTotal._sum.amountCents || 0)}.
              Review the invoice and complete payment.
            </span>
          </div>

          <Link
            className="btn btn-primary"
            href="/portal/payments?view=due"
          >
            Review &amp; Pay
          </Link>
        </section>
      ) : null}

      <div className="dashboard-section-intro">
        <div>
          <span className="dashboard-section-kicker">Reporting period</span>
          <h2>Performance Filters</h2>
          <p>Choose a period or custom date range to update the revenue, loads, and average load value shown below.</p>
        </div>
      </div>

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
            <span className="dashboard-card-help">Total revenue from loads in the selected period.</span>
            <Trend value={percentageChange(revenueCents, previousRevenueCents)} />
          </div>
        </article>

        <article className="dashboard-metric-card">
          <span className="dashboard-metric-icon loads"><MetricIcon kind="loads" /></span>
          <div>
            <span className="dashboard-metric-label">Loads</span>
            <strong>{currentLoadCount}</strong>
            <span className="dashboard-card-help">Number of loads handled in the selected period.</span>
            <Trend value={percentageChange(currentLoadCount, previousLoadCount)} />
          </div>
        </article>

        <article className="dashboard-metric-card">
          <span className="dashboard-metric-icon average"><MetricIcon kind="average" /></span>
          <div>
            <span className="dashboard-metric-label">Average Load Value</span>
            <strong>{money(averageLoadCents)}</strong>
            <span className="dashboard-card-help">Average revenue generated per load.</span>
            <Trend value={percentageChange(averageLoadCents, previousAverageCents)} />
          </div>
        </article>
      </section>

      <div className="dashboard-section-intro">
        <div>
          <span className="dashboard-section-kicker">Onboarding status</span>
          <h2>Account Progress</h2>
          <p>Follow these stages to understand what is complete, what is pending, and what you should do next.</p>
        </div>
      </div>

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

      <div className="dashboard-section-intro">
        <div>
          <span className="dashboard-section-kicker">Quick actions</span>
          <h2>Manage Your Portal</h2>
          <p>Use these shortcuts to communicate with your dispatcher, manage documents, and review billing.</p>
        </div>
      </div>

      <section className="dashboard-quick-grid">
        <Link className="dashboard-quick-card chat" href="/portal/chat">
          <span className="quick-icon"><QuickIcon kind="chat" /></span>
          <span><strong>Chat</strong><small>Discuss current or upcoming loads with your dispatcher.</small></span>
          <b aria-hidden="true">›</b>
        </Link>
        <Link className="dashboard-quick-card documents" href="/portal/documents">
          <span className="quick-icon"><QuickIcon kind="documents" /></span>
          <span><strong>Documents</strong><small>{missingDocuments ? `${missingDocuments} required file${missingDocuments === 1 ? "" : "s"} missing. Upload them to continue onboarding.` : "All required documents are complete."}</small></span>
          <b aria-hidden="true">›</b>
        </Link>
        <Link className="dashboard-quick-card invoices" href="/portal/invoices">
          <span className="quick-icon"><QuickIcon kind="invoices" /></span>
          <span><strong>Invoices</strong><small>{dueInvoiceCount ? `${dueInvoiceCount} due · ${money(dueInvoiceTotal._sum.amountCents || 0)}. Review your billing status.` : "No due invoices. Your billing is up to date."}</small></span>
          <b aria-hidden="true">›</b>
        </Link>
      </section>

      <div className="dashboard-section-intro">
        <div>
          <span className="dashboard-section-kicker">Latest overview</span>
          <h2>Recent Activity & Trucker Snapshot</h2>
          <p>See your latest portal actions and a quick summary of your company, equipment, package, and most recent load.</p>
        </div>
      </div>

      <section className="dashboard-lower-grid">
        <article className="soft-dashboard-panel">
          <div className="soft-panel-heading">
            <div><span>Today</span><h2>Recent Portal Activity</h2><p className="dashboard-card-help">Your latest uploads, messages, payments, and account updates.</p></div>
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
            <div><span>Current operation</span><h2>Trucker Snapshot</h2><p className="dashboard-card-help">A quick overview of your current business setup and latest load.</p></div>
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