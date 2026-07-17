"use client";

import { useCallback, useEffect, useRef } from "react";

export function SessionNavigationGuard() {
  const checkingRef = useRef(false);

  const verifySession = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const response = await fetch(`/api/auth/session?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Cache-Control": "no-cache"
        }
      });

      if (!response.ok) {
        window.location.replace("/login?message=Please+sign+in+to+continue.");
      }
    } catch {
      // A failed network check should not expose a stale protected screen.
      window.location.replace("/login?message=Please+sign+in+to+continue.");
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void verifySession();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void verifySession();
      }
    };

    const onPopState = () => {
      void verifySession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void verifySession();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [verifySession]);

  return null;
}
