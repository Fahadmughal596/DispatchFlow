import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/utils";

export default async function AgreementPage() {
  const user = await requireRole("TRUCKER");
  const agreements = await db.agreement.findMany({
    where: { truckerId: user.truckerProfile!.id },
    include: { invoice: true },
    orderBy: { signedAt: "desc" }
  });

  return (
    <>
      <div className="page-header"><div><h1>Agreements</h1><p>First-payment agreement records.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Version</th><th>Signer</th><th>Invoice</th><th>Signed</th><th>Acceptance</th><th>Action</th></tr></thead>
            <tbody>
              {agreements.map((agreement) => (
                <tr key={agreement.id}>
                  <td>{agreement.version}</td>
                  <td>{agreement.signerName}</td>
                  <td>{agreement.invoice.invoiceNumber}</td>
                  <td>{dateTime(agreement.signedAt)}</td>
                  <td>{agreement.acceptanceCode}</td>
                  <td><a className="btn btn-secondary btn-sm" href={`/print/agreement/${agreement.id}`}>Print</a></td>
                </tr>
              ))}
              {!agreements.length ? <tr><td colSpan={6}><div className="empty">Agreement appears after the first payment.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
