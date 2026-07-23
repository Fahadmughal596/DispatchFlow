import { redirect } from "next/navigation";

type PaymentQuery = {
  view?: string;
  page?: string;
  from?: string;
  to?: string;
};

export default async function TruckerPaymentsRedirect({
  searchParams
}: {
  searchParams: Promise<PaymentQuery>;
}) {
  const query = await searchParams;

  const targetView =
    query.view === "history" ? "history" : "due";

  const params = new URLSearchParams({
    view: targetView
  });

  if (query.page) params.set("page", query.page);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);

  redirect(`/portal/invoices?${params.toString()}`);
}
