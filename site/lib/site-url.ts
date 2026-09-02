import "server-only";

/**
 * Where this site actually lives.
 *
 * This is deliberately NOT read from the request. A link we put in an email, or
 * hand to Stripe to come back to, must point at us and nowhere else: anyone can
 * send a request with an `Origin` or `Host` header naming their own site, and
 * if we echoed it back we would be posting our customers a genuine-looking
 * email that signs them in on somebody else's domain.
 *
 * In development there is no configured address, so localhost stands in. In
 * production a missing setting is an error, never a guess.
 */
export function siteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}
