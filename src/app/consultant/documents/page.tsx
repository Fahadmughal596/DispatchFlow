import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentChecklist } from "@/lib/required-documents";
import { reviewDocumentAction } from "@/actions/documents";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { PAGE_SIZE, positivePage } from "@/lib/portal-filters";
import { date } from "@/lib/utils";

export default async function ConsultantDocumentsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; document?: string; page?: string; trucker?: string }> }) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  const query = await searchParams;
  const page = positivePage(query.page);
  const selectedTruckerId = Number(query.trucker || 0) || undefined;
  const truckers = await db.truckerProfile.findMany({ where: { assignedConsultantId: user.id }, include: { user: true }, orderBy: { createdAt: "desc" } });
  const compliance = await Promise.all(truckers.map(async (trucker) => ({ trucker, checklist: await documentChecklist(trucker.id) })));
  const where = { trucker: { assignedConsultantId: user.id }, ...(selectedTruckerId ? { truckerId: selectedTruckerId } : {}) };
  const [documents, total] = await Promise.all([
    db.document.findMany({ where, include: { trucker: { include: { user: true } }, uploader: true, reviewer: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.document.count({ where })
  ]);
  const selected = query.document ? await db.document.findFirst({ where: { id: Number(query.document), trucker: { assignedConsultantId: user.id } }, include: { trucker: { include: { user: true } }, uploader: true, reviewer: true } }) : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <>
    <div className="page-header"><div><h1>Trucker Documents</h1><p>View and review documents uploaded by your assigned truckers. Dispatchers cannot upload files on behalf of truckers.</p></div></div>
    <Flash success={query.success} error={query.error} />

    <div className="card" style={{ marginBottom: 18 }}><div className="card-title"><div><h2>Required Compliance</h2><p>Three mandatory records per trucker.</p></div></div><div className="responsive-card-list compliance-list">
      {compliance.map(({ trucker, checklist }) => { const missing = checklist.filter((item) => !item.complete); return <article key={trucker.id}><div><strong>{trucker.user.name}</strong><span>{trucker.companyName || "No company"}</span></div><b className={`badge ${missing.length ? "badge-orange" : "badge-green"}`}>{missing.length} missing</b><p>{missing.length ? missing.map((item) => item.type).join(", ") : "Complete"}</p></article>; })}
      {!compliance.length ? <div className="empty">No assigned truckers.</div> : null}
    </div></div>

    <div className="alert alert-info" style={{ marginBottom: 18 }}>
      <strong>Document access is view and review only.</strong>{" "}
      Truckers must upload their own required and optional documents from the Trucker Portal.
    </div>

    <div className="filter-bar"><form className="filter-form" method="get"><div className="field"><label>Filter by trucker</label><select name="trucker" defaultValue={query.trucker || ""}><option value="">All assigned truckers</option>{truckers.map((trucker) => <option value={trucker.id} key={trucker.id}>{trucker.user.name}</option>)}</select></div><button className="btn btn-secondary">Apply Filter</button></form></div>

    <div className="split document-review-split"><div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Trucker</th><th>Document</th><th>Kind</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {documents.map((document) => <tr key={document.id}><td><strong>{document.trucker.user.name}</strong></td><td><strong>{document.documentTitle || document.type}</strong><div className="text-small text-muted">{document.originalName}</div></td><td>{document.documentRequestId ? "Required" : "Other"}</td><td><StatusBadge value={document.status} /></td><td className="actions"><a className="btn btn-secondary btn-sm" href={`/api/documents/${document.id}`}>Open</a><a className="btn btn-primary btn-sm" href={`/consultant/documents?document=${document.id}&page=${page}${query.trucker ? `&trucker=${query.trucker}` : ""}`}>Review</a></td></tr>)}
      {!documents.length ? <tr><td colSpan={5}><div className="empty">No uploaded documents.</div></td></tr> : null}
    </tbody></table></div><Pagination page={Math.min(page, totalPages)} totalPages={totalPages} pathname="/consultant/documents" searchParams={{ trucker: query.trucker }} /></div>
    <div className="card sticky-card">{selected ? <><div className="card-title"><div><h2>Review {selected.documentTitle || selected.type}</h2><p>{selected.trucker.user.name}</p></div><StatusBadge value={selected.status} /></div><div className="detail-list"><div className="detail"><span>File</span><strong>{selected.originalName}</strong></div><div className="detail"><span>Uploaded by</span><strong>{selected.uploader.name}</strong></div></div><form action={reviewDocumentAction} style={{ marginTop: 16 }}><input type="hidden" name="documentId" value={selected.id} /><div className="field"><label>Review notes</label><textarea name="reviewNotes" defaultValue={selected.reviewNotes || ""} /></div><div className="actions"><button className="btn btn-primary btn-sm" name="status" value="APPROVED">Approve</button><button className="btn btn-danger btn-sm" name="status" value="REJECTED">Reject</button><button className="btn btn-orange btn-sm" name="status" value="REPLACEMENT_REQUESTED">Request Replacement</button></div></form></> : <div className="empty">Select a document to review.</div>}</div></div>
  </>;
}
