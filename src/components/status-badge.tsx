export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone =
    [
      "PAID",
      "APPROVED",
      "ACTIVE",
      "COMPLETED",
      "DROPPED_OFF",
      "SUCCEEDED",
      "CONTACT_MADE",
      "CONTRACT_MADE",
      "INVOICE_PAID"
    ].includes(normalized)
      ? "badge-green"
      : ["REJECTED", "CANCELLED", "FAILED", "DISPUTED", "EXPIRED"].includes(normalized)
        ? "badge-red"
        : [
            "PENDING_APPROVAL",
            "PENDING_INVOICE",
            "OVERDUE",
            "REPLACEMENT_REQUESTED",
            "REQUESTED",
            "LEAD_SIGNED_UP"
          ].includes(normalized)
          ? "badge-orange"
          : "badge-blue";

  return <span className={`badge ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
