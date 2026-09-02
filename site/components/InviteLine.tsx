// The one line that leads to the page. It goes at the very bottom of the site,
// under the blessing, on every page.
//
// Deliberately quiet: a small door, six words, an arrow. Easy to walk past,
// easy to follow. It is not a banner and it never becomes one.

import Link from "next/link";
import { Door, ArrowRight } from "@/components/know-jesus/marks";

export default function InviteLine() {
  return (
    <div className="kj">
      <div className="invite-rule">
        <div className="dots" />
        <Link className="invite-link" href="/know-jesus">
          <Door />
          <span className="label">Want to know Jesus?</span>
          <ArrowRight className="arrow" />
        </Link>
        <div className="dots" />
      </div>
    </div>
  );
}
