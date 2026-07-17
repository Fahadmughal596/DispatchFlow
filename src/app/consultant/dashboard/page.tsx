import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { ConsultantProfilePopup } from "@/components/consultant-profile-popup";
import { dateTime, money } from "@/lib/utils";

function daysAgo(days: number) { return new Date(Date.now() - days * 86400000); }

export default async function ConsultantDashboard({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const profile = user.consultantProfile;

  const [assigned, contacted, activeTruckers, pendingInvoices, paidInvoices, unpaidInvoices, weeklyPaid, monthlyPaid, weeklyLoads, monthlyLoads, missingDocs] = await Promise.all([
    db.lead.count({ where: { assignedToId: user.id } }),
    db.lead.count({ where: { assignedToId: user.id, currentStatus: { in: ["CONTACT_MADE", "CONTRACT_MADE", "PENDING_INVOICE", "INVOICE_SENT", "INVOICE_PAID"] } } }),
    db.truckerProfile.count({ where: { assignedConsultantId: user.id, accountStatus: "ACTIVE" } }),
    db.invoice.count({ where: { consultantId: user.id, status: { in: ["DRAFT", "PENDING_APPROVAL", "SENT", "VIEWED", "UNPAID"] } } }),
    db.invoice.count({ where: { consultantId: user.id, status: "PAID" } }),
    db.invoice.count({ where: { consultantId: user.id, status: { in: ["UNPAID", "OVERDUE"] } } }),
    db.payment.aggregate({ where: { invoice: { consultantId: user.id }, status: "SUCCEEDED", paidAt: { gte: daysAgo(7) } }, _sum: { dispatcherCommissionCents: true, amountCents: true } }),
    db.payment.aggregate({ where: { invoice: { consultantId: user.id }, status: "SUCCEEDED", paidAt: { gte: daysAgo(30) } }, _sum: { dispatcherCommissionCents: true, amountCents: true } }),
    db.load.count({ where: { consultantId: user.id, createdAt: { gte: daysAgo(7) } } }),
    db.load.count({ where: { consultantId: user.id, createdAt: { gte: daysAgo(30) } } }),
    db.documentRequest.count({ where: { trucker: { assignedConsultantId: user.id }, status: { in: ["REQUESTED", "REJECTED", "REPLACEMENT_REQUESTED", "EXPIRED"] } } })
  ]);

  const latest = await db.lead.findMany({
    where: { assignedToId: user.id },
    include: { trucker: { include: { user: true, conversations: { where: { consultantId: user.id }, take: 1 }, invoices: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    orderBy: { updatedAt: "desc" }, take: 6
  });

  const stages = [
    ["Assigned", assigned], ["Contacted", contacted], ["Pending invoice", pendingInvoices], ["Paid", paidInvoices], ["Active", activeTruckers]
  ] as const;

  return (
    <>
      {!profile?.profileCompletedAt ? <ConsultantProfilePopup name={user.name} email={user.email} phone={user.phone} specialty={profile?.specialty} workingHours={profile?.workingHours} timeZone={profile?.timeZone} bio={profile?.bio} commissionRate={(profile?.commissionRateBps || 500) / 100} /> : null}
      <Flash success={query.success} error={query.error} />

      <section className="dispatcher-hero">
        <div>
          <span className="dispatcher-eyebrow">Consultant / Dispatcher workspace</span>
          <h1>Welcome back, {user.name} <span>👋</span></h1>
          <p>Manage assigned truckers, documents, invoices, payments and loads from one focused workspace.</p>
          <div className="dispatcher-hero-actions"><Link className="btn btn-primary" href="/consultant/truckers">View assigned truckers</Link><Link className="btn btn-secondary" href="/consultant/loads">Create a load</Link></div>
        </div>
        <div className="dispatcher-profile-summary">
          <span>Commission rate</span><strong>{(profile?.commissionRateBps || 500) / 100}%</strong>
          <small>{profile?.specialty || "Complete your specialty"}</small>
          <Link href="/consultant/profile">Edit profile →</Link>
        </div>
      </section>

      <section className="dispatcher-kpi-grid">
        <article className="dispatcher-kpi"><span>Assigned truckers</span><strong>{assigned}</strong><small>{activeTruckers} active clients</small></article>
        <article className="dispatcher-kpi"><span>Pending invoices</span><strong>{pendingInvoices}</strong><small>{unpaidInvoices} unpaid / overdue</small></article>
        <article className="dispatcher-kpi"><span>Weekly paid volume</span><strong>{money(weeklyPaid._sum.amountCents || 0)}</strong><small>{money(weeklyPaid._sum.dispatcherCommissionCents || 0)} commission</small></article>
        <article className="dispatcher-kpi"><span>Loads this week</span><strong>{weeklyLoads}</strong><small>{monthlyLoads} during last 30 days</small></article>
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

      <div className="dispatcher-monthly-strip"><span>Last 30 days</span><strong>{money(monthlyPaid._sum.amountCents || 0)} paid volume</strong><strong>{money(monthlyPaid._sum.dispatcherCommissionCents || 0)} commission earned</strong><strong>{monthlyLoads} loads created</strong></div>
    </>
  );
}
