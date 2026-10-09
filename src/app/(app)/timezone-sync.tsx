"use client";

import { useEffect } from "react";
import { syncTimezoneAction } from "./timezone-actions";

/** Once per browser session, offers the browser's timezone to the server (which only saves it over the UTC default). */
export function TimezoneSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("timezone-synced")) return;
      sessionStorage.setItem("timezone-synced", "1");
      void syncTimezoneAction(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // Storage can be unavailable (private mode); skipping the sync is harmless.
    }
  }, []);
  return null;
}
