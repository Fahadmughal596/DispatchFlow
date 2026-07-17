"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function SidebarToggle() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const applySidebarState = useCallback((next: boolean) => {
    setOpen(next);

    const sidebar = document.getElementById("portal-sidebar");
    sidebar?.classList.toggle("open", next);
    sidebar?.setAttribute("aria-hidden", next ? "false" : "true");

    document.documentElement.classList.toggle("sidebar-open", next);
    document.body.classList.toggle("sidebar-open", next);
  }, []);

  useEffect(() => {
    applySidebarState(false);
  }, [pathname, applySidebarState]);

  useEffect(() => {
    const close = () => applySidebarState(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onViewportChange = () => {
      if (window.innerWidth > 900) close();
    };

    window.addEventListener("portal:navigate", close);
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("portal:navigate", close);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("sidebar-open");
      document.body.classList.remove("sidebar-open");
    };
  }, [applySidebarState]);

  return (
    <>
      <button
        className="mobile-menu-button mobile-toggle"
        type="button"
        onClick={() => applySidebarState(!open)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="portal-sidebar"
      >
        <span />
        <span />
        <span />
      </button>

      <button
        className={`mobile-sidebar-backdrop ${open ? "show" : ""}`}
        type="button"
        onClick={() => applySidebarState(false)}
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
      />
    </>
  );
}
