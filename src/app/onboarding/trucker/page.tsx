import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function TruckerOnboardingPage() {
  await requireRole("TRUCKER");
  redirect("/portal/dashboard");
}
