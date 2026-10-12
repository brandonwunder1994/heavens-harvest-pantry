import Link from "next/link";
export function OrderTabs({mock=false}:{mock?:boolean}) {
  return <nav aria-label="Order type" className="owner-tabs"><Link href="/owner/orders" aria-current={!mock?"page":undefined}>Real orders</Link><Link href="/mockorder/orders" aria-current={mock?"page":undefined}>Mock orders</Link></nav>;
}
