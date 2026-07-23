import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentChecklist } from "@/lib/required-documents";
import { truckerUploadDocumentAction } from "@/actions/documents";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { OtherDocumentModal } from "@/components/other-document-modal";
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
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" }
      ],
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
            Upload mandatory records and manage supporting documents
            from one place.
          </p>
        </div>

        <span className="badge badge-orange">
          {checklist.filter((item) => !item.complete).length}
          {" "}Mandatory Missing
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
            const isCoi =
              item.type === "Certificate of Insurance (COI)";
            const isDriverLicense =
              item.type === "Driver's License";

            return (
              <article
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
                      <span>Uploaded By</span>
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
                        View
                      </a>
                    ) : null}
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span>Optional</span>
            <h2>Other Documents</h2>
            <p>Add, view and edit supporting documents.</p>
          </div>
        </div>

        <OtherDocumentModal triggerStyle="card" />

        <div className="card all-other-documents-card">
          <div className="card-title">
            <div>
              <h3>All Other Documents</h3>
              <p>
                Recently added or edited documents appear first.
              </p>
            </div>

            <span className="badge badge-blue">
              {totalOther} Documents
            </span>
          </div>

          <div className="other-document-list">
            {otherDocuments.map((document) => (
              <article
                className="other-document-row"
                key={document.id}
              >
                <div className="other-document-file-icon">
                  ↗
                </div>

                <div className="other-document-info">
                  <strong>
                    {document.documentTitle ||
                      "Other Document"}
                  </strong>

                  <span>{document.originalName}</span>

                  <small>
                    Uploaded by {document.uploader.name}
                    {" • "}
                    Expiry: {date(document.expiresAt)}
                  </small>
                </div>

                <StatusBadge value={document.status} />

                <div className="actions other-document-actions">
                  <a
                    className="btn btn-primary btn-sm"
                    href={`/api/documents/${document.id}`}
                  >
                    View
                  </a>

                  <OtherDocumentModal
                    document={{
                      id: document.id,
                      title:
                        document.documentTitle || "Other Document",
                      documentNumber:
                        document.documentNumber || "",
                      issuingAuthority:
                        document.issuingAuthority || "",
                      expiresAt: document.expiresAt
                        ? new Date(document.expiresAt)
                            .toISOString()
                            .slice(0, 10)
                        : "",
                      notes: document.notes || "",
                      originalName: document.originalName
                    }}
                  />
                </div>
              </article>
            ))}

            {!otherDocuments.length ? (
              <div className="empty">
                No optional documents added yet.
              </div>
            ) : null}
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
