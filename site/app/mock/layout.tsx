import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { mockRun } from "@/lib/mock-auth";
import { mockBasketKey } from "@/lib/mock-policy";
import { getShop } from "@/lib/settings";
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PracticeBanner } from "@/components/mock/PracticeBanner";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:{default:"MOCK — practice shop",template:"MOCK — %s"},robots:{index:false,follow:false}};
export default async function MockLayout({children}:{children:React.ReactNode}) {
  if (!(await isSignedIn())) redirect("/owner/login?next=/mockorder");
  const run=await mockRun();
  const shop=await getShop();
  return <CartProvider key={run??"unstarted"} shop={shop} initialOrdersPaused={false} practice storageKey={mockBasketKey(run??"unstarted")}><PracticeBanner/><Header shop={shop}/><main>{children}</main><Footer shop={shop} practice/></CartProvider>;
}
