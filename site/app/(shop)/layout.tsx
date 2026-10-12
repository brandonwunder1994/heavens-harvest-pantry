import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getShop } from "@/lib/settings";
import { ordersArePaused } from "@/lib/fulfilment";

/**
 * Her prices, flavors and verses come from the database, so these pages cannot
 * be frozen at build time. Rendering each request also ensures the Tuesday
 * pickup cutoff uses the current Arizona date.
 */
export const revalidate = 0;

/** Everything a customer sees: masthead, page, footer, and the basket. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();

  return (
    <CartProvider shop={shop} initialOrdersPaused={ordersArePaused()}>
      <Header shop={shop} />
      <main>{children}</main>
      <Footer shop={shop} />
    </CartProvider>
  );
}
