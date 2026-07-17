import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/utils";

export default async function AdminReportsPage() {
  await requireRole("SUPER_ADMIN");
  const consultants = await db.user.findMany({
    where: { role: "CONSULTANT_DISPATCHER" },
    include: {
      assignedLeads: true,
      createdInvoices: true,
      createdLoads: true
    },
    orderBy: { name: "asc" }
  });

  const rows = await Promise.all(
    consultants.map(async (consultant) => {
      const payments = await db.payment.aggregate({
        where: {
          status: "SUCCEEDED",
          invoice: { consultantId: consultant.id }
        },
        _sum: {
          amountCents: true,
          dispatcherCommissionCents: true,
          companyNetCents: true
        }
      });

      return {
        consultant,
        assigned: consultant.assignedLeads.length,
        contact: consultant.assignedLeads.filter((lead) =>
          ["CONTACT_MADE", "INVOICE_SENT", "INVOICE_PAID"].includes(lead.currentStatus)
        ).length,
        invoiced: consultant.createdInvoices.length,
        paid: consultant.createdInvoices.filter((invoice) => invoice.status === "PAID").length,
        loads: consultant.createdLoads.length,
        amount: payments._sum.amountCents || 0,
        commission: payments._sum.dispatcherCommissionCents || 0,
        companyNet: payments._sum.companyNetCents || 0
      };
    })
  );

  return (
    <>
      <div className="page-header"><div><h1>Dispatcher Reports</h1><p>Workload, funnel, payment and company-cut reporting.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Consultant</th><th>Assigned</th><th>Contact Made</th><th>Invoiced</th><th>Paid</th><th>Loads</th><th>Collected</th><th>Commission</th><th>Company net</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.consultant.id}>
                  <td><strong>{row.consultant.name}</strong></td>
                  <td>{row.assigned}</td>
                  <td>{row.contact}</td>
                  <td>{row.invoiced}</td>
                  <td>{row.paid}</td>
                  <td>{row.loads}</td>
                  <td>{money(row.amount)}</td>
                  <td>{money(row.commission)}</td>
                  <td>{money(row.companyNet)}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={9}><div className="empty">No consultant data.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
