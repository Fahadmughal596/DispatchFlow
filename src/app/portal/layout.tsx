import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/auth";
import { SessionNavigationGuard } from "@/components/session-navigation-guard";

export default async function TruckerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TRUCKER");
  return (
    <>
      <SessionNavigationGuard />
      <PortalShell user={user} title="Trucker Portal">{children}</PortalShell>
    </>
  );
}
