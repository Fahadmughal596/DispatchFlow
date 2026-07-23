"use client";

import { useEffect, useState } from "react";
import {
  truckerUploadOtherDocumentAction,
  truckerUpdateOtherDocumentAction
} from "@/actions/documents";

type EditableDocument = {
  id: number;
  title: string;
  documentNumber: string;
  issuingAuthority: string;
  expiresAt: string;
  notes: string;
  originalName: string;
};

type OtherDocumentModalProps = {
  document?: EditableDocument;
  triggerStyle?: "card" | "button" | "header";
};

export function OtherDocumentModal({
  document,
  triggerStyle = "button"
}: OtherDocumentModalProps) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(document);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document?.id;
    window.addEventListener("keydown", onKeyDown);
    window.document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.document.body.style.overflow = "";
    };
  }, [open, document?.id]);

  return (
    <>
      {triggerStyle === "card" ? (
        <button
          type="button"
          className="card add-other-document-card"
          onClick={() => setOpen(true)}
        >
          <span className="add-other-document-icon">+</span>

          <span className="add-other-document-copy">
            <strong>Add Other Document</strong>
            <small>
              Upload W-9, Factoring NOA, voided check, permits or
              another supporting document.
            </small>
          </span>

          <span className="add-other-document-arrow">→</span>
        </button>
      ) : triggerStyle === "header" ? (
        <button
          type="button"
          className="btn btn-primary add-other-document-header-btn"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true">+</span>
          Add Other Document
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setOpen(true)}
        >
          Edit
        </button>
      )}

      {open ? (
        <div
          className="other-document-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section
            className="other-document-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="other-document-modal-title"
          >
            <button
              type="button"
              className="other-document-modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <header className="other-document-modal-heading">
              <span>Optional Document</span>

              <h2 id="other-document-modal-title">
                {editing ? "Edit Document" : "Add Other Document"}
              </h2>

              <p>
                {editing
                  ? "Update details or optionally replace the existing file."
                  : "Enter document details and upload its file."}
              </p>
            </header>

            <form
              action={
                editing
                  ? truckerUpdateOtherDocumentAction
                  : truckerUploadOtherDocumentAction
              }
            >
              {document ? (
                <input
                  type="hidden"
                  name="documentId"
                  value={document.id}
                />
              ) : null}

              <div className="form-grid">
                <div className="field">
                  <label>Document Title</label>
                  <input
                    name="documentTitle"
                    defaultValue={document?.title || ""}
                    placeholder="e.g. W-9, Factoring NOA"
                    required
                  />
                </div>

                <div className="field">
                  <label>Reference Number</label>
                  <input
                    name="documentNumber"
                    defaultValue={document?.documentNumber || ""}
                  />
                </div>

                <div className="field">
                  <label>Issuing Authority</label>
                  <input
                    name="issuingAuthority"
                    defaultValue={document?.issuingAuthority || ""}
                  />
                </div>

                <div className="field">
                  <label>Expiry Date</label>
                  <input
                    name="expiresAt"
                    type="date"
                    defaultValue={document?.expiresAt || ""}
                  />
                </div>
              </div>

              <div className="field">
                <label>Notes</label>
                <textarea
                  name="notes"
                  defaultValue={document?.notes || ""}
                  placeholder="Optional details"
                />
              </div>

              <div className="field">
                <label>
                  {editing ? "Replace File (Optional)" : "File"}
                </label>

                <input
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  required={!editing}
                />

                <span className="hint">
                  {editing
                    ? `Current file: ${document?.originalName}`
                    : "PDF, Word or image. Maximum 10MB."}
                </span>
              </div>

              <div className="other-document-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary">
                  {editing ? "Save Changes" : "Add Document"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
