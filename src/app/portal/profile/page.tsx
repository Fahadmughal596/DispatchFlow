import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateTruckerProfileAction } from "@/actions/profile";
import { Flash } from "@/components/flash";
import { EquipmentSelect } from "@/components/equipment-select";

export default async function TruckerProfilePage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireRole("TRUCKER");
  const profile = user.truckerProfile!;
  const query = await searchParams;
  const equipment = await db.equipmentCategory.findMany({
    where: { OR: [{ isActive: true }, { id: profile.equipmentCategoryId || -1 }] },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, commissionBps: true }
  });

  return (
    <>
      <div className="page-header"><div><h1>Profile</h1><p>Keep account, package and truck details current.</p></div></div>
      <Flash success={query.success} error={query.error} />
      <div className="card">
        <form action={updateTruckerProfileAction}>
          <div className="form-grid">
            <div className="field"><label>Full name</label><input name="name" defaultValue={user.name} required /></div>
            <div className="field"><label>Email</label><input value={user.email} disabled /></div>
            <div className="field"><label>Phone</label><input name="phone" defaultValue={user.phone || ""} /></div>
            <div className="field"><label>Personal address</label><input name="address" defaultValue={profile.address || ""} /></div>
            <div className="field"><label>Company name</label><input name="companyName" defaultValue={profile.companyName || ""} /></div>
            <div className="field"><label>Company address</label><input name="companyAddress" defaultValue={profile.companyAddress || ""} /></div>
            <div className="field"><label>Number of trucks</label><input name="numberOfTrucks" type="number" min="1" defaultValue={profile.numberOfTrucks || 1} /></div>
            <div className="field"><label>MC / DOT</label><input name="mcDot" defaultValue={profile.mcDot || ""} /></div>
            <div className="field"><label>Equipment type</label><EquipmentSelect options={equipment} defaultValue={profile.equipmentCategoryId} /></div>
            <div className="field"><label>Package type</label><input name="packageType" defaultValue={profile.packageType || ""} required /></div>
            <div className="field"><label>Truck current location</label><input name="truckCurrentLocation" defaultValue={profile.truckCurrentLocation || ""} required /></div>
            <div className="field"><label>Availability</label><input name="availability" defaultValue={profile.availability || ""} /></div>
            <div className="field"><label>Factoring company</label><input name="factoringCompany" defaultValue={profile.factoringCompany || ""} /></div>
            <div className="field"><label>Insurance status</label><input name="insuranceStatus" defaultValue={profile.insuranceStatus || ""} /></div>
            <div className="field"><label>Billing method</label><select name="billingMethod" defaultValue={profile.billingMethod}><option value="FIXED">Fixed package</option><option value="PERCENTAGE">Percentage based</option></select></div>
            <div className="field"><label>Custom rate percentage (optional)</label><input name="ratePercentage" type="number" step="0.01" min="0" max="100" defaultValue={profile.ratePercentageBps ? profile.ratePercentageBps / 100 : ""} /></div>
          </div>
          <div className="field"><label>Preferred lanes</label><textarea name="preferredLanes" defaultValue={profile.preferredLanes || ""} /></div>
          <div className="field"><label>Avoided lanes</label><textarea name="avoidedLanes" defaultValue={profile.avoidedLanes || ""} /></div>
          <button className="btn btn-primary">Save Profile</button>
        </form>
      </div>
    </>
  );
}
