import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrintDocument } from "@/components/print-document";
import { dateTime } from "@/lib/utils";

export default async function PrintAgreement({
  params
}: {
  params: Promise<{ agreementId: string }>;
}) {
  const user = await requireUser();
  const { agreementId } = await params;
  const agreement = await db.agreement.findUnique({
    where: { id: Number(agreementId) },
    include: {
      trucker: { include: { user: true } },
      invoice: true
    }
  });
  if (!agreement) notFound();

  const allowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "TRUCKER" && agreement.trucker.userId === user.id) ||
    (user.role === "CONSULTANT_DISPATCHER" && agreement.invoice.consultantId === user.id);
  if (!allowed) notFound();

  return (
    <PrintDocument title="Dispatch Agreement" subtitle={`Version ${agreement.version}`}>
      <p>
        This record confirms that <strong>{agreement.signerName}</strong> accepted
        the dispatch agreement and authorized the first invoice payment for
        <strong> {agreement.invoice.invoiceNumber}</strong>.
      </p>
      <table>
        <tbody>
          <tr><th>Trucker</th><td>{agreement.trucker.user.name}</td></tr>
          <tr><th>Signer</th><td>{agreement.signerName}</td></tr>
          <tr><th>Signed at</th><td>{dateTime(agreement.signedAt)}</td></tr>
          <tr><th>Acceptance certificate</th><td>{agreement.acceptanceCode}</td></tr>
        </tbody>
      </table>
    </PrintDocument>
  );
}
