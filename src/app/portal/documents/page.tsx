import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentChecklist } from "@/lib/required-documents";
import {
  truckerUploadDocumentAction,
  truckerUploadOtherDocumentAction
} from "@/actions/documents";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { PAGE_SIZE, positivePage } from "@/lib/portal-filters";
import { date } from "@/lib/utils";

export default async function TruckerDocumentsPage({
  searchParams
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const user = await requireRole("TRUCKER");
  const params = await searchParams;
  const page = positivePage(params.page);
  const truckerId = user.truckerProfile!.id;

  const rawChecklist = await documentChecklist(truckerId);

  const checklist = [...rawChecklist].sort((a, b) => {
    const aUploaded = a.document ? 1 : 0;
    const bUploaded = b.document ? 1 : 0;

    if (aUploaded !== bUploaded) return bUploaded - aUploaded;

    const aTime = a.document?.updatedAt
      ? new Date(a.document.updatedAt).getTime()
      : 0;

    const bTime = b.document?.updatedAt
      ? new Date(b.document.updatedAt).getTime()
      : 0;

    return bTime - aTime;
  });

  const where = {
    truckerId,
    documentRequestId: null
  };

  const [otherDocuments, totalOther] = await Promise.all([
    db.document.findMany({
      where,
      include: {
        uploader: true,
        reviewer: true
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    db.document.count({ where })
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalOther / PAGE_SIZE)
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <p>
            Upload the 3 mandatory records and any additional
            supporting documents.
          </p>
        </div>

        <span className="badge badge-orange">
          {checklist.filter((item) => !item.complete).length} Mandatory Missing
        </span>
      </div>

      <Flash success={params.success} error={params.error} />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>Required</span>
            <h2>Mandatory Documents</h2>
            <p>
              MC Permit, COI and Driver&apos;s License are required.
            </p>
          </div>
        </div>

        <div className="grid grid-2 document-card-grid">
          {checklist.map((item) => {
            const isMcPermit = item.type === "MC Permit";
            const isCoi = item.type === "Certificate of Insurance (COI)";
            const isDriverLicense =
              item.type === "Driver's License";

            return (
              <div
                className="card document-upload-card"
                key={item.type}
              >
                <div className="card-title">
                  <div>
                    <h3>{item.type}</h3>
                    <p>
                      {item.document?.originalName ||
                        "No file uploaded"}
                    </p>
                  </div>

                  <StatusBadge value={item.statusLabel} />
                </div>

                {item.document ? (
                  <div className="detail-list">
                    <div className="detail">
                      <span>Uploaded by</span>
                      <strong>
                        {item.document.uploader.name}
                      </strong>
                    </div>

                    {isDriverLicense ? (
                      <div className="detail">
                        <span>Expiry</span>
                        <strong>
                          {date(item.document.expiresAt)}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <form
                  action={truckerUploadDocumentAction}
                  style={{ marginTop: 15 }}
                >
                  <input
                    type="hidden"
                    name="type"
                    value={item.type}
                  />

                  {isCoi ? (
                    <div className="field">
                      <label>Company Policy Number</label>
                      <input
                        name="documentNumber"
                        defaultValue={
                          item.document?.documentNumber || ""
                        }
                      />
                    </div>
                  ) : null}

                  {isDriverLicense ? (
                    <div className="form-grid">
                      <div className="field">
                        <label>Issue Date</label>
                        <input
                          name="issueDate"
                          type="date"
                          defaultValue={
                            item.document?.issueDate
                              ? new Date(item.document.issueDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : ""
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Expiry Date</label>
                        <input
                          name="expiresAt"
                          type="date"
                          defaultValue={
                            item.document?.expiresAt
                              ? new Date(item.document.expiresAt)
                                  .toISOString()
                                  .slice(0, 10)
                              : ""
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="field">
                    <label>
                      {isMcPermit
                        ? "Upload MC Permit"
                        : isCoi
                          ? "Upload COI"
                          : "Upload Driver License"}
                    </label>

                    <input
                      name="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      required
                    />

                    <span className="hint">
                      PDF, Word or image. Maximum 10MB.
                    </span>
                  </div>

                  <div className="actions">
                    <button className="btn btn-primary">
                      {item.document
                        ? "Replace File"
                        : "Upload File"}
                    </button>

                    {item.document ? (
                      <a
                        className="btn btn-secondary"
                        href={`/api/documents/${item.document.id}`}
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>Optional</span>
            <h2>Other Documents</h2>
            <p>
              Add W-9, Factoring NOA, voided check, permits or
              custom files.
            </p>
          </div>
        </div>

        <div className="card optional-document-form">
          <form action={truckerUploadOtherDocumentAction}>
            <div className="form-grid">
              <div className="field">
                <label>Document Title</label>
                <input
                  name="documentTitle"
                  placeholder="e.g. W-9, Factoring NOA"
                  required
                />
              </div>

              <div className="field">
                <label>Reference Number</label>
                <input name="documentNumber" />
              </div>

              <div className="field">
                <label>Issuing Authority</label>
                <input name="issuingAuthority" />
              </div>

              <div className="field">
                <label>Expiry Date</label>
                <input name="expiresAt" type="date" />
              </div>
            </div>

            <div className="field">
              <label>Notes</label>
              <textarea name="notes" />
            </div>

            <div className="field">
              <label>File</label>
              <input
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                required
              />
            </div>

            <button className="btn btn-primary">
              Add Another Document
            </button>
          </form>
        </div>

        <div className="card document-list-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>File</th>
                  <th>Uploaded By</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {otherDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>
                        {document.documentTitle ||
                          "Other Document"}
                      </strong>
                    </td>
                    <td>{document.originalName}</td>
                    <td>{document.uploader.name}</td>
                    <td>{date(document.expiresAt)}</td>
                    <td>
                      <StatusBadge value={document.status} />
                    </td>
                    <td>
                      <a
                        className="btn btn-secondary btn-sm"
                        href={`/api/documents/${document.id}`}
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}

                {!otherDocuments.length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">
                        No optional documents added yet.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Pagination
            page={Math.min(page, totalPages)}
            totalPages={totalPages}
            pathname="/portal/documents"
            searchParams={{}}
          />
        </div>
      </section>
    </>
  );
}

