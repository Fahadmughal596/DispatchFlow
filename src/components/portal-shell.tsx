import Link from "next/link";
import { Role } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { openNotificationAction } from "@/actions/notifications";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { ROLE_LABEL } from "@/lib/constants";
import { db } from "@/lib/db";
import { missingDocumentSummary } from "@/lib/required-documents";

function roleItems(role: Role, missingCount: number): NavItem[] {
  if (role === "TRUCKER") {
    return [
      { href: "/portal/dashboard", label: "Dashboard", icon: "home" },
      { href: "/portal/chat", label: "Chat", icon: "chat" },
      { href: "/portal/documents", label: "Documents", icon: "folder", badge: missingCount },
      { href: "/portal/invoices", label: "Invoices", icon: "invoice" },
      { href: "/portal/payments", label: "Payments", icon: "card" },
      { href: "/portal/loads", label: "Loads", icon: "truck" },
      { href: "/portal/profile", label: "Settings", icon: "settings" }
    ];
  }

  if (role === "CONSULTANT_DISPATCHER") {
    return [
      { href: "/consultant/dashboard", label: "Dashboard", icon: "home" },
      { href: "/consultant/leads", label: "Client Workflow", icon: "workflow" },
      { href: "/consultant/truckers", label: "Assigned Truckers", icon: "users" },
      { href: "/consultant/chat", label: "Chat", icon: "chat" },
      { href: "/consultant/documents", label: "Documents", icon: "folder", badge: missingCount },
      { href: "/consultant/invoices", label: "Invoices", icon: "invoice" },
      { href: "/consultant/payments", label: "Payments", icon: "card" },
      { href: "/consultant/loads", label: "Loads", icon: "truck" },
      { href: "/consultant/profile", label: "Profile & Commission", icon: "settings" }
    ];
  }

  return [
    { href: "/super-admin/dashboard", label: "Dashboard", icon: "DB" },
    { href: "/super-admin/users", label: "All Users", icon: "US" },
    { href: "/super-admin/consultants", label: "Consultants", icon: "CO" },
    { href: "/super-admin/leads", label: "Leads & Assignment", icon: "LE" },
    { href: "/super-admin/chats", label: "Chat Audit", icon: "CH" },
    { href: "/super-admin/documents", label: "Documents", icon: "DO", badge: missingCount },
    { href: "/super-admin/invoices", label: "Invoices", icon: "IN" },
    { href: "/super-admin/loads", label: "Loads", icon: "LO" },
    { href: "/super-admin/payments", label: "Payments", icon: "PA" },
    { href: "/super-admin/reports", label: "Reports", icon: "RE" },
    { href: "/super-admin/settings", label: "Settings", icon: "SE" },
    { href: "/super-admin/audit-logs", label: "Audit Logs", icon: "AU" }
  ];
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M18 19h-2v-6h4v4a2 2 0 0 1-2 2ZM6 19H4a2 2 0 0 1-2-2v-4h4Z" />
      <path d="M16 19a4 4 0 0 1-4 3" />
    </svg>
  );
}

export async function PortalShell({
  user,
  children,
  title
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
  title: string;
}) {
  const summary = await missingDocumentSummary(user);
  const notifications = await db.notification.findMany({
    where: { userId: user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  const t2f = await db.appSetting.findUnique({ where: { key: "t2f_url" } });
  const t2fUrl = t2f?.value || process.env.T2F_URL || "https://truck2fleet.com/public/";
  const isTrucker = user.role === "TRUCKER";
  const isConsultant = user.role === "CONSULTANT_DISPATCHER";
  const items = isTrucker
    ? roleItems(user.role, summary.missingCount)
    : [
        ...roleItems(user.role, summary.missingCount),
        { href: t2fUrl, label: "Open / Connect T2F", icon: "T2", external: true }
      ];

  return (
    <div className={`app-shell ${isTrucker ? "trucker-shell" : isConsultant ? "consultant-shell" : ""}`}>
      <aside className="sidebar" id="portal-sidebar" aria-label="Portal navigation">
        <Link className="brand dispatchflow-brand" href={isTrucker ? "/portal/dashboard" : "/"}>
          <span className="dispatchflow-logo-mark" aria-hidden="true">
            <span className="dispatchflow-logo-wing" />
            <span className="dispatchflow-logo-road" />
          </span>
          <span className="dispatchflow-wordmark">
            Dispatch<span>Flow</span>
            <small>{ROLE_LABEL[user.role]}</small>
          </span>
        </Link>

        <NavLinks items={items} />

        {isTrucker ? (
          <div className="trucker-sidebar-cards">
            <a className="sidebar-action-card" href={t2fUrl} target="_blank" rel="noopener noreferrer">
              <span className="sidebar-action-icon"><LinkIcon /></span>
              <span>
                <strong>Connect with T2F</strong>
                <small>Stay connected with our team for updates and support.</small>
              </span>
              <span className="sidebar-action-arrow">›</span>
            </a>

            <Link className="sidebar-help-card" href="/portal/support">
              <span className="sidebar-action-icon"><HeadsetIcon /></span>
              <span>
                <strong>Contact Super Admin</strong>
                <small>Account, access, billing, or support</small>
              </span>
              <span className="sidebar-help-button">Contact us</span>
            </Link>
          </div>
        ) : null}

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="btn btn-secondary" style={{ width: "100%", marginTop: 8 }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="main-area">
        <header className={`topbar ${isTrucker ? "trucker-topbar" : isConsultant ? "consultant-topbar" : ""}`}>
          <div className="topbar-left">
            <SidebarToggle />
            {!isTrucker && !isConsultant ? <div className="page-title">{title}</div> : null}
          </div>

          <div className="top-actions">
            <details className="notification-details">
              <summary>
                <button className="notification-btn" type="button" aria-label="Notifications">
                  <BellIcon />
                  {notifications.length + (summary.missingCount ? 1 : 0) > 0 ? (
                    <span className="notification-count">
                      {notifications.length + (summary.missingCount ? 1 : 0)}
                    </span>
                  ) : null}
                </button>
              </summary>
              <div className="card notification-menu">
                <div className="card-title"><h3>Notifications</h3></div>
                {summary.missingCount ? (
                  <Link className="modal-like required-alert" style={{ display: "block", marginBottom: 8 }} href={summary.url}>
                    <strong>Required documents missing</strong>
                    <div className="text-muted text-small">{summary.message}</div>
                  </Link>
                ) : null}
                {notifications.map((notification) => (
                  <form action={openNotificationAction} key={notification.id}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button className="conversation-link notification-row">
                      <span>
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                      </span>
                    </button>
                  </form>
                ))}
                {!notifications.length && !summary.missingCount ? (
                  <div className="text-muted text-small">No unread notifications.</div>
                ) : null}
              </div>
            </details>

            {isTrucker || isConsultant ? (
              <details className="user-menu-details">
                <summary className="top-user-summary">
                  <span className="top-user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                  <span className="top-user-chevron">⌄</span>
                </summary>
                <div className="card top-user-menu">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <Link href={isTrucker ? "/portal/profile" : "/consultant/profile"}>Account settings</Link>
                  <form action={logoutAction}>
                    <button type="submit">Sign out</button>
                  </form>
                </div>
              </details>
            ) : null}
          </div>
        </header>

        <section className={`page ${isTrucker ? "trucker-page" : isConsultant ? "consultant-page" : ""}`}>
          {!isTrucker && summary.missingCount ? (
            <div className="alert alert-error">
              <strong>Required document alert: </strong>
              {summary.message}{" "}
              <Link className="link" href={summary.url}>Open Documents</Link>
            </div>
          ) : null}
          {children}
        </section>
      </main>
    </div>
  );
}
