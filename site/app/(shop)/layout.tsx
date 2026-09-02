import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getShop } from "@/lib/settings";

/**
 * Her prices, flavors and verses come from the database, so these pages cannot
 * be frozen at build time. They are cached and rebuilt at most every five
 * minutes, and saving anything on her page rebuilds them at once, so a change
 * she makes is on the site before she has finished reading the confirmation.
 */
export const revalidate = 300;

/** Everything a customer sees: masthead, page, footer, and the basket. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();

  return (
    <CartProvider shop={shop}>
      <Header shop={shop} />
      <main>{children}</main>
      <Footer shop={shop} />
    </CartProvider>
  );
}
