"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  external?: boolean;
};

function NavGlyph({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
    case "chat":
      return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A8 8 0 1 1 21 15Z"/></svg>;
    case "folder":
      return <svg {...common}><path d="M3 6.5h6l2 2h10v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 9h18"/></svg>;
    case "invoice":
      return <svg {...common}><path d="M6 3h9l3 3v15H6Z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>;
    case "card":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>;
    case "truck":
      return <svg {...common}><path d="M3 6h11v10H3Z"/><path d="M14 10h4l3 3v3h-7Z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
    case "users":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "workflow":
      return <svg {...common}><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6.5 7.5l4.3 8.8M17.5 7.5l-4.3 8.8"/></svg>;
    case "external":
      return <svg {...common}><path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>;
    default:
      return <span className="nav-glyph-fallback">{name.slice(0, 2).toUpperCase()}</span>;
  }
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        const active = !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={`${item.href}-${item.label}`}
            className={`nav-link ${active ? "active" : ""}`}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={() => window.dispatchEvent(new Event("portal:navigate"))}
          >
            <span className="nav-icon"><NavGlyph name={item.icon} /></span>
            <span className="nav-label">{item.label}</span>
            {item.badge ? <span className="badge badge-orange">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
