import type { Metadata } from "next";
import "./owner.css";

export const metadata: Metadata = {
  title: "Owner's page",
  robots: { index: false, follow: false },
};

/** The owner's side has its own chrome: no shop masthead, no footer. */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream">{children}</div>;
}
