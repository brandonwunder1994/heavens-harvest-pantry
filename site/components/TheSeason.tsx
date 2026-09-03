"use client";

// The season, corrected against the visitor's own clock.
//
// The server already stamps one on <html>, which is right for any page that
// was rendered or revalidated recently. A page that was built once and cached
// for a long time would carry the season it was built in, though, so this
// checks on arrival and puts it right. It renders nothing.

import { useEffect } from "react";
import { seasonFor } from "@/lib/season";

export function TheSeason() {
  useEffect(() => {
    const now = seasonFor(new Date());
    if (document.documentElement.dataset.season !== now) {
      document.documentElement.dataset.season = now;
    }
  }, []);

  return null;
}
