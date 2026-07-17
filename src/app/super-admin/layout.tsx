import { PortalShell } from "@/components/portal-shell";
import { requireRole } from "@/lib/auth";
import { SessionNavigationGuard } from "@/components/session-navigation-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("SUPER_ADMIN");
  return (
    <>
      <SessionNavigationGuard />
      <PortalShell user={user} title="Super Admin Portal">{children}</PortalShell>
    </>
  );
}
