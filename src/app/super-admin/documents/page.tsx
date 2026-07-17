import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { missingDocumentSummary } from "@/lib/required-documents";
import { syncRequiredDocumentsAction, } from "@/actions/admin";
import { reviewDocumentAction } from "@/actions/documents";
import { StatusBadge } from "@/components/status-badge";
import { date } from "@/lib/utils";

export default async function AdminDocumentsPage({
  searchParams
}: {
  searchParams: Promise<{ document?: string }>;
}) {
  const admin = await requireRole("SUPER_ADMIN");
  const query = await searchParams;
  const [summary, documents] = await Promise.all([
    missingDocumentSummary(admin),
    db.document.findMany({
      include: {
        trucker: { include: { user: true } },
        uploader: true,
        reviewer: true
      },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const selected = documents.find((document) => document.id === Number(query.document));

  return (
    <>
      <div className="page-header">
        <div><h1>Document Oversight</h1><p>All required trucker documents, upload sources and review status.</p></div>
        <form action={syncRequiredDocumentsAction}><button className="btn btn-secondary">Sync Required Tabs</button></form>
      </div>

      {summary.missingCount ? (
        <div className="card required-alert" style={{ marginBottom: 18 }}>
          <div className="card-title">
            <div><h2>Missing Required Documents</h2><p>{summary.message}</p></div>
            <span className="badge badge-orange">{summary.missingCount} Missing</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Trucker</th><th>Missing documents</th></tr></thead>
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.truckerId}><td><strong>{row.truckerName}</strong></td><td>{row.missing.join(", ")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <div className="alert alert-success">All truckers have every required document.</div>}

      <div className="split">
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Trucker</th><th>Document</th><th>Uploaded by</th><th>Reviewed by</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td><strong>{document.trucker.user.name}</strong><div className="text-small text-muted">{document.trucker.companyName || "No company"}</div></td>
                    <td><strong>{document.type}</strong><div className="text-small text-muted">{document.originalName}</div></td>
                    <td>{document.uploader.name}</td>
                    <td>{document.reviewer?.name || "Pending"}</td>
                    <td>{date(document.expiresAt)}</td>
                    <td><StatusBadge value={document.status} /></td>
                    <td className="actions">
                      <a className="btn btn-secondary btn-sm" href={`/api/documents/${document.id}`}>Open</a>
                      <a className="btn btn-primary btn-sm" href={`/super-admin/documents?document=${document.id}`}>Review</a>
                    </td>
                  </tr>
                ))}
                {!documents.length ? <tr><td colSpan={7}><div className="empty">No uploaded documents.</div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card sticky-card">
          {selected ? (
            <>
              <div className="card-title"><div><h2>Review {selected.type}</h2><p>{selected.trucker.user.name}</p></div><StatusBadge value={selected.status} /></div>
              <div className="detail-list">
                <div className="detail"><span>File</span><strong>{selected.originalName}</strong></div>
                <div className="detail"><span>Uploader</span><strong>{selected.uploader.name}</strong></div>
                <div className="detail"><span>Reference</span><strong>{selected.documentNumber || "—"}</strong></div>
                <div className="detail"><span>Issuer</span><strong>{selected.issuingAuthority || "—"}</strong></div>
              </div>
              <form action={reviewDocumentAction} style={{ marginTop: 16 }}>
                <input type="hidden" name="documentId" value={selected.id} />
                <div className="field"><label>Review notes</label><textarea name="reviewNotes" defaultValue={selected.reviewNotes || ""} /></div>
                <div className="actions">
                  <button className="btn btn-primary btn-sm" name="status" value="APPROVED">Approve</button>
                  <button className="btn btn-danger btn-sm" name="status" value="REJECTED">Reject</button>
                  <button className="btn btn-orange btn-sm" name="status" value="REPLACEMENT_REQUESTED">Request Replacement</button>
                </div>
              </form>
            </>
          ) : <div className="empty">Select a document to review.</div>}
        </div>
      </div>
    </>
  );
}
