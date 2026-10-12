/** Pure guards shared by routes, setup tools and isolation tests. */
export function mockKeysValid(env: Record<string, string | undefined>) {
  return /^sk_test_/.test(env.STRIPE_MOCK_SECRET_KEY ?? "") && /^pk_test_/.test(env.STRIPE_MOCK_PUBLISHABLE_KEY ?? "");
}
export function isMockSession(session: { livemode?: boolean; metadata?: Record<string, string> | null }) {
  return session.livemode === false && session.metadata?.practice === "true" && Boolean(session.metadata?.mock_run_id);
}
export const mockBasketKey = (run: string) => `hhp-mock-cart-v1:${run}`;
export function practiceHref(href: string, practice: boolean): string {
  if (!practice || !href.startsWith("/") || href.startsWith("//") || /^\/(mock|mockorder|owner|api)(\/|\?|#|$)/.test(href)) return href;
  return `/mockorder${href === "/" ? "" : href}`;
}
