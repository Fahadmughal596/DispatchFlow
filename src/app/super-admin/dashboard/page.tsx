import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { money } from "@/lib/utils";

export default async function AdminDashboard() {
  await requireRole("SUPER_ADMIN");

  const [users, leads, consultants, activeClients, invoices, payments, revenue] = await Promise.all([
    db.user.count(),
    db.lead.count(),
    db.user.count({ where: { role: "CONSULTANT_DISPATCHER" } }),
    db.truckerProfile.count({ where: { accountStatus: "ACTIVE" } }),
    db.invoice.count(),
    db.payment.count({ where: { status: "SUCCEEDED" } }),
    db.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _sum: { companyNetCents: true }
    })
  ]);

  const statusGroups = await db.lead.groupBy({
    by: ["currentStatus"],
    _count: { _all: true }
  });

  return (
    <>
      <div className="page-header"><div><h1>Super Admin Dashboard</h1><p>Global portal control, reporting and audit.</p></div></div>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <StatCard label="All users" value={users} />
        <StatCard label="Consultants / Dispatchers" value={consultants} />
        <StatCard label="All leads" value={leads} />
        <StatCard label="Active clients" value={activeClients} />
        <StatCard label="Invoices" value={invoices} />
        <StatCard label="Successful payments" value={payments} />
        <StatCard label="Company net" value={money(revenue._sum.companyNetCents || 0)} />
        <StatCard label="System status" value="Online" foot="MySQL + Next.js" />
      </div>
      <div className="card">
        <div className="card-title"><div><h2>Lead funnel</h2><p>Clean V1 status sequence.</p></div></div>
        <div className="grid grid-4">
          {statusGroups.map((group) => (
            <div className="metric" key={group.currentStatus}>
              <strong>{group._count._all}</strong>
              <span>{group.currentStatus.replaceAll("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
