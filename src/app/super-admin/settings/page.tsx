import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createEquipmentCategoryAction,
  deleteEquipmentCategoryAction,
  saveSettingsAction,
  updateEquipmentCategoryAction
} from "@/actions/admin";
import { Flash } from "@/components/flash";

type SettingsQuery = {
  success?: string;
  error?: string;
  step?: string;
};

const steps = [
  { key: "portal", label: "Portal Settings", description: "Integrations and invoice controls" },
  { key: "add-equipment", label: "Add Equipment", description: "Create a new equipment category" },
  { key: "manage-equipment", label: "Manage Equipment", description: "Edit, activate or remove categories" }
] as const;

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<SettingsQuery>;
}) {
  await requireRole("SUPER_ADMIN");
  const query = await searchParams;
  const activeStep = steps.some((item) => item.key === query.step) ? query.step! : "portal";
  const activeIndex = steps.findIndex((item) => item.key === activeStep);

  const [settings, categories] = await Promise.all([
    db.appSetting.findMany(),
    db.equipmentCategory.findMany({
      include: { _count: { select: { truckers: true } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const map = new Map<string, string>(settings.map((setting) => [setting.key, setting.value]));
  const previousStep = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const nextStep = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Complete one settings section at a time. Your existing settings and equipment data remain unchanged.</p>
        </div>
      </div>

      <Flash success={query.success} error={query.error} />

      <nav className="settings-stepper" aria-label="Settings steps">
        {steps.map((step, index) => (
          <Link
            href={`/super-admin/settings?step=${step.key}`}
            key={step.key}
            className={`settings-step ${activeStep === step.key ? "active" : ""} ${index < activeIndex ? "complete" : ""}`}
          >
            <span>{index < activeIndex ? "✓" : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.description}</small>
            </div>
          </Link>
        ))}
      </nav>

      {activeStep === "portal" ? (
        <section className="card settings-step-panel">
          <div className="card-title">
            <div>
              <span className="eyebrow">Step 1 of 3</span>
              <h2>Portal Settings</h2>
              <p>Configure optional integrations and invoice approval rules.</p>
            </div>
          </div>

          <form action={saveSettingsAction} className="settings-panel-form">
            <div className="field">
              <label>Open / Connect T2F URL</label>
              <input name="t2fUrl" type="url" defaultValue={map.get("t2f_url") || process.env.T2F_URL || ""} />
            </div>
            <label className="checkbox">
              <input name="invoiceApproval" type="checkbox" defaultChecked={(map.get("invoice_approval") ?? "1") === "1"} />
              <span>Require Super Admin approval before invoices are sent.</span>
            </label>
            <button className="btn btn-primary">Save Portal Settings</button>
          </form>
        </section>
      ) : null}

      {activeStep === "add-equipment" ? (
        <section className="card settings-step-panel">
          <div className="card-title">
            <div>
              <span className="eyebrow">Step 2 of 3</span>
              <h2>Add Equipment Category</h2>
              <p>Create one category with its commission and display order.</p>
            </div>
          </div>

          <form action={createEquipmentCategoryAction} className="settings-panel-form">
            <div className="form-grid settings-responsive-grid">
              <div className="field"><label>Equipment name</label><input name="name" required placeholder="Dry Van" /></div>
              <div className="field"><label>Commission percentage</label><input name="commission" type="number" min="0" max="100" step="0.01" required /></div>
              <div className="field"><label>Display order</label><input name="displayOrder" type="number" defaultValue="0" /></div>
              <div className="field field-span-2"><label>Description</label><textarea name="description" placeholder="Optional explanation for admins and truckers" /></div>
            </div>
            <button className="btn btn-primary">Add Equipment</button>
          </form>
        </section>
      ) : null}

      {activeStep === "manage-equipment" ? (
        <section className="card settings-step-panel">
          <div className="card-title">
            <div>
              <span className="eyebrow">Step 3 of 3</span>
              <h2>Equipment & Commission Management</h2>
              <p>Edit, deactivate or safely delete equipment categories.</p>
            </div>
          </div>

          <div className="equipment-admin-list settings-equipment-list">
            {categories.map((category) => (
              <article key={category.id} className="equipment-admin-row settings-equipment-card">
                <form action={updateEquipmentCategoryAction} className="equipment-admin-form settings-equipment-form">
                  <input type="hidden" name="id" value={category.id} />
                  <div className="field"><label>Name</label><input name="name" defaultValue={category.name} required /></div>
                  <div className="field"><label>Commission %</label><input name="commission" type="number" min="0" max="100" step="0.01" defaultValue={category.commissionBps / 100} required /></div>
                  <div className="field"><label>Order</label><input name="displayOrder" type="number" defaultValue={category.displayOrder} /></div>
                  <div className="field"><label>Used by</label><input value={`${category._count.truckers} trucker${category._count.truckers === 1 ? "" : "s"}`} disabled /></div>
                  <div className="field field-span-2"><label>Description</label><input name="description" defaultValue={category.description || ""} /></div>
                  <label className="checkbox equipment-active"><input name="isActive" type="checkbox" defaultChecked={category.isActive} /><span>Active</span></label>
                  <button className="btn btn-secondary btn-sm">Save</button>
                </form>
                <form action={deleteEquipmentCategoryAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <button className="btn btn-danger btn-sm settings-delete-button" disabled={category._count.truckers > 0} title={category._count.truckers > 0 ? "Deactivate categories already used by truckers" : "Delete category"}>Delete</button>
                </form>
              </article>
            ))}
            {!categories.length ? <div className="premium-empty-state">No equipment categories yet.</div> : null}
          </div>
        </section>
      ) : null}

      <div className="settings-step-actions">
        {previousStep ? <Link className="btn btn-secondary" href={`/super-admin/settings?step=${previousStep.key}`}>Back</Link> : <span />}
        {nextStep ? <Link className="btn btn-primary" href={`/super-admin/settings?step=${nextStep.key}`}>Next: {nextStep.label}</Link> : <Link className="btn btn-primary" href="/super-admin/dashboard">Finish Settings</Link>}
      </div>
    </>
  );
}
