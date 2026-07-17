import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { payInvoiceAction } from "@/actions/invoices";
import { Flash } from "@/components/flash";
import { date, money } from "@/lib/utils";
import { effectiveInvoiceDueDate } from "@/lib/portal-filters";

export default async function PayInvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("TRUCKER");
  const { invoiceId } = await params;
  const query = await searchParams;
  const invoice = await db.invoice.findFirst({
    where: { id: Number(invoiceId), truckerId: user.truckerProfile!.id },
    include: { agreement: true }
  });
  if (!invoice) notFound();

  const previousPayment = await db.payment.findFirst({
    where: { truckerId: user.truckerProfile!.id, status: "SUCCEEDED" }
  });
  const firstPayment = !previousPayment;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{firstPayment ? "Acknowledge & Pay" : "Pay Invoice"}</h1>
          <p>{invoice.invoiceNumber}</p>
        </div>
        <Link className="btn btn-secondary" href="/portal/payments?view=due">Back to Due Invoices</Link>
      </div>
      <Flash error={query.error} />
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title"><h2>Invoice Summary</h2></div>
          <div className="detail-list">
            <div className="detail"><span>Invoice</span><strong>{invoice.invoiceNumber}</strong></div>
            <div className="detail"><span>Amount</span><strong>{money(invoice.amountCents)}</strong></div>
            <div className="detail"><span>Description</span><strong>{invoice.description}</strong></div>
            <div className="detail"><span>Effective due date</span><strong>{date(effectiveInvoiceDueDate(invoice))}</strong></div>
            <div className="detail"><span>Payment method</span><strong>Demo Payment Gateway</strong></div>
            <div className="detail"><span>First-month aging</span><strong>{invoice.isFirstInvoice ? "Grace period applied" : "Standard"}</strong></div>
          </div>
          <div className="profile-actions">
            <Link className="btn btn-secondary" href={`/print/invoice/${invoice.id}`}>View Invoice</Link>
          </div>
        </div>

        <div className="card">
          <form action={payInvoiceAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            {firstPayment ? (
              <>
                <div className="modal-like" style={{ marginBottom: 16 }}>
                  <strong>Dispatch Agreement v1.0</strong>
                  <p className="text-small text-muted">
                    Acknowledge the agreement and authorize the first invoice payment to activate the account.
                  </p>
                  <details className="agreement-read-more">
                    <summary>Read More</summary>
                    <div className="text-small text-muted">
                      <p>The Consultant / Dispatcher may provide dispatch support, load coordination and related portal services according to the agreed package.</p>
                      <p>Your typed name and checkbox acknowledgement create an acceptance record connected to this invoice and payment.</p>
                      <p>Future invoices only require payment unless the agreement version changes.</p>
                    </div>
                  </details>
                </div>
                <div className="field"><label>Signer name</label><input name="signerName" defaultValue={user.name} required /></div>
                <label className="checkbox">
                  <input name="accept" type="checkbox" required />
                  <span>I acknowledge the dispatch agreement and authorize this payment.</span>
                </label>
              </>
            ) : null}
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }}>
              {firstPayment ? "Acknowledge & Pay" : "Pay Invoice"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
