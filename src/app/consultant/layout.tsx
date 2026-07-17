import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/auth";
import { SessionNavigationGuard } from "@/components/session-navigation-guard";

export default async function ConsultantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CONSULTANT_DISPATCHER");
  if (!user.consultantProfile?.profileCompletedAt) redirect("/onboarding/consultant");
  return (
    <>
      <SessionNavigationGuard />
      <PortalShell user={user} title="Consultant / Dispatcher Portal">{children}</PortalShell>
    </>
  );
}
