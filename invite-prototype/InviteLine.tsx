// The one line that leads to the page. It goes at the very bottom of the site,
// under the blessing, on every page.
//
// Deliberately quiet: a small door, six words, an arrow. Easy to walk past,
// easy to follow. It is not a banner and it never becomes one.

import { Door, ArrowRight } from './marks';

export default function InviteLine() {
  return (
    <div className="kj">
      <div className="invite-rule">
        <div className="dots" />
        <a className="invite-link" href="/know-jesus">
          <Door />
          <span className="label">Want to know Jesus?</span>
          <ArrowRight className="arrow" />
        </a>
        <div className="dots" />
      </div>
    </div>
  );
}
