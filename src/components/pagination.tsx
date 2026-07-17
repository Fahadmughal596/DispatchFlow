import Link from "next/link";

export function Pagination({ page, totalPages, pathname, searchParams }: { page: number; totalPages: number; pathname: string; searchParams: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null;
  const href = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) if (value && key !== "page") params.set(key, value);
    params.set("page", String(nextPage));
    return `${pathname}?${params.toString()}`;
  };
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return <nav className="pagination-bar" aria-label="Pagination">
    <Link className={`btn btn-secondary btn-sm ${page <= 1 ? "disabled" : ""}`} href={page <= 1 ? href(1) : href(page - 1)} aria-disabled={page <= 1}>Previous</Link>
    <div className="pagination-pages">{start > 1 ? <><Link href={href(1)}>1</Link>{start > 2 ? <span>…</span> : null}</> : null}{pages.map((item) => <Link key={item} className={item === page ? "active" : ""} href={href(item)} aria-current={item === page ? "page" : undefined}>{item}</Link>)}{end < totalPages ? <>{end < totalPages - 1 ? <span>…</span> : null}<Link href={href(totalPages)}>{totalPages}</Link></> : null}</div>
    <span className="pagination-summary">Page {page} of {totalPages}</span>
    <Link className={`btn btn-secondary btn-sm ${page >= totalPages ? "disabled" : ""}`} href={page >= totalPages ? href(totalPages) : href(page + 1)} aria-disabled={page >= totalPages}>Next</Link>
  </nav>;
}
