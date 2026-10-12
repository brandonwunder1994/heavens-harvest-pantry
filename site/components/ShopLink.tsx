"use client";
import Link from "next/link";
import { createContext, useContext } from "react";
import { practiceHref } from "@/lib/mock-policy";
export const PracticeContext = createContext(false);
export function usePractice() { return useContext(PracticeContext); }
export default function ShopLink(props: React.ComponentProps<typeof Link>) {
  const practice = usePractice();
  return <Link {...props} href={typeof props.href === "string" ? practiceHref(props.href, practice) : props.href} />;
}
