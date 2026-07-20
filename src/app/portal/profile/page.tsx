import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flash } from "@/components/flash";
import { TruckerProfileSettingsForm } from "@/components/trucker-profile-settings-form";

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
      <div className="page-header">
        <div>
          <h1>Profile Settings</h1>
          <p>Complete your personal, company and truck information step by step.</p>
        </div>
      </div>
      <Flash success={query.success} error={query.error} />
      <TruckerProfileSettingsForm
        equipment={equipment}
        profile={{
          profileImagePath: profile.profileImagePath,
          address: profile.address,
          companyName: profile.companyName,
          companyAddress: profile.companyAddress,
          numberOfTrucks: profile.numberOfTrucks,
          mcDot: profile.mcDot,
          equipmentCategoryId: profile.equipmentCategoryId,
          packageType: profile.packageType,
          truckCurrentLocation: profile.truckCurrentLocation,
          availability: profile.availability,
          factoringCompany: profile.factoringCompany,
          insuranceStatus: profile.insuranceStatus,
          billingMethod: profile.billingMethod,
          ratePercentageBps: profile.ratePercentageBps,
          preferredLanes: profile.preferredLanes,
          avoidedLanes: profile.avoidedLanes
        }}
        user={{ name: user.name, email: user.email, phone: user.phone }}
      />
    </>
  );
}
