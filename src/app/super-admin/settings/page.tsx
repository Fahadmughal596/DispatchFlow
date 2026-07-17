import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createEquipmentCategoryAction,
  deleteEquipmentCategoryAction,
  saveSettingsAction,
  updateEquipmentCategoryAction
} from "@/actions/admin";
import { Flash } from "@/components/flash";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole("SUPER_ADMIN");
  const query = await searchParams;
  const [settings, categories] = await Promise.all([
    db.appSetting.findMany(),
    db.equipmentCategory.findMany({
      include: { _count: { select: { truckers: true } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    })
  ]);
  const map = new Map<string, string>(settings.map((setting) => [setting.key, setting.value]));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Portal configuration, equipment categories and commission rules.</p>
        </div>
      </div>
      <Flash success={query.success} error={query.error} />

      <section className="admin-settings-grid">
        <div className="card">
          <div className="card-title"><div><h2>Portal settings</h2><p>Optional integrations and invoice controls.</p></div></div>
          <form action={saveSettingsAction}>
            <div className="field">
              <label>Open / Connect T2F URL</label>
              <input name="t2fUrl" type="url" defaultValue={map.get("t2f_url") || process.env.T2F_URL || ""} />
            </div>
            <label className="checkbox">
              <input name="invoiceApproval" type="checkbox" defaultChecked={(map.get("invoice_approval") ?? "1") === "1"} />
              <span>Require Super Admin approval before invoices are sent.</span>
            </label>
            <button className="btn btn-primary" style={{ marginTop: 18 }}>Save Settings</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title"><div><h2>Add equipment category</h2><p>The commission is shown to truckers during equipment selection.</p></div></div>
          <form action={createEquipmentCategoryAction}>
            <div className="form-grid">
              <div className="field"><label>Equipment name</label><input name="name" required placeholder="Dry Van" /></div>
              <div className="field"><label>Commission percentage</label><input name="commission" type="number" min="0" max="100" step="0.01" required /></div>
              <div className="field"><label>Display order</label><input name="displayOrder" type="number" defaultValue="0" /></div>
              <div className="field field-span-2"><label>Description</label><textarea name="description" placeholder="Optional explanation for admins and truckers" /></div>
            </div>
            <button className="btn btn-primary">Add Equipment</button>
          </form>
        </div>
      </section>

      <section className="card section-block">
        <div className="card-title"><div><h2>Equipment & commission management</h2><p>Edit, deactivate or safely delete equipment categories.</p></div></div>
        <div className="equipment-admin-list">
          {categories.map((category) => (
            <article key={category.id} className="equipment-admin-row">
              <form action={updateEquipmentCategoryAction} className="equipment-admin-form">
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
                <button className="btn btn-danger btn-sm" disabled={category._count.truckers > 0} title={category._count.truckers > 0 ? "Deactivate categories already used by truckers" : "Delete category"}>Delete</button>
              </form>
            </article>
          ))}
          {!categories.length ? <div className="premium-empty-state">No equipment categories yet.</div> : null}
        </div>
      </section>
    </>
  );
}
