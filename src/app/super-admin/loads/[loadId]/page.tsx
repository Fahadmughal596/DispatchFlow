import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { dateTime, money } from "@/lib/utils";

export default async function AdminLoadDetailsPage({
  params
}: {
  params: Promise<{ loadId: string }>;
}) {
  await requireRole("SUPER_ADMIN");

  const { loadId } = await params;
  const id = Number(loadId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const load = await db.load.findUnique({
    where: { id },
    include: {
      trucker: {
        include: {
          user: true
        }
      },
      consultant: true,
      documents: {
        include: {
          uploader: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!load) {
    notFound();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{load.loadRef}</h1>
          <p>Complete load information and attached documents.</p>
        </div>

        <div className="actions">
          <StatusBadge value={load.status} />

          <Link
            className="btn btn-secondary"
            href="/super-admin/loads"
          >
            Back to Loads
          </Link>
        </div>
      </div>

      <section
        className="grid grid-3"
        style={{ marginBottom: 18 }}
      >
        <article className="card stat-card">
          <div className="stat-label">Load Rate</div>
          <div className="stat-value">
            {money(load.rateCents)}
          </div>
        </article>

        <article className="card stat-card">
          <div className="stat-label">Trucker</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {load.trucker.user.name}
          </div>
        </article>

        <article className="card stat-card">
          <div className="stat-label">Dispatcher</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {load.consultant.name}
          </div>
        </article>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-title">
            <div>
              <h2>Load Details</h2>
              <p>Route, dates, broker and current status.</p>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail">
              <span>Pickup Location</span>
              <strong>{load.pickupLocation}</strong>
            </div>

            <div className="detail">
              <span>Delivery Location</span>
              <strong>{load.deliveryLocation}</strong>
            </div>

            <div className="detail">
              <span>Pickup Date</span>
              <strong>{dateTime(load.pickupAt)}</strong>
            </div>

            <div className="detail">
              <span>Delivery Date</span>
              <strong>{dateTime(load.deliveryAt)}</strong>
            </div>

            <div className="detail">
              <span>Broker</span>
              <strong>{load.broker || "Not provided"}</strong>
            </div>

            <div className="detail">
              <span>Status</span>
              <strong>
                <StatusBadge value={load.status} />
              </strong>
            </div>
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label>Notes</label>

            <div className="modal-like">
              {load.notes || "No notes available."}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-title">
            <div>
              <h2>Load Documents</h2>
              <p>
                {load.documents.length} attached document
                {load.documents.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          <div className="other-document-list">
            {load.documents.map((document) => (
              <article
                className="other-document-row"
                key={document.id}
              >
                <div className="other-document-info">
                  <strong>{document.type}</strong>
                  <span>{document.originalName}</span>

                  <small>
                    Uploaded by {document.uploader.name}
                    {" • "}
                    {dateTime(document.createdAt)}
                  </small>
                </div>

                <a
                  className="btn btn-secondary btn-sm"
                  href={`/api/load-documents/${document.id}`}
                >
                  View
                </a>
              </article>
            ))}

            {!load.documents.length ? (
              <div className="empty">
                No documents attached to this load.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
