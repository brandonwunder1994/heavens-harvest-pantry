import { redirect, notFound } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { mockRun } from "@/lib/mock-auth";
import Home from "@/app/(shop)/page";
import Menu from "@/app/(shop)/menu/page";
import Story from "@/app/(shop)/story/page";
import Pickup from "@/app/(shop)/pickup/page";
import Bowl from "@/app/(shop)/bowl/page";
import Blessing from "@/app/(shop)/blessing-bags/page";
import Verses from "@/app/(shop)/verses/page";
import Reviews from "@/app/(shop)/reviews/page";
export default async function MockShopPage({params,searchParams}:{params:Promise<{path?:string[]}>;searchParams:Promise<{flavor?:string}>}) {
  const path=(await params).path?.join("/")??"";
  if (!(await isSignedIn())) redirect(`/owner/login?next=${encodeURIComponent(`/mockorder${path?`/${path}`:""}`)}`);
  if (!(await mockRun())) redirect("/api/mock/start");
  const redirects:Record<string,string>={blend:"menu",jars:"menu",delivery:"pickup",send:"blessing-bags",rewards:"menu","rewards/me":"menu"};
  if (redirects[path]) redirect(`/mockorder/${redirects[path]}`);
  switch(path) {
    case "":return <Home/>;
    case "menu":return <Menu/>;
    case "story":return <Story/>;
    case "pickup":return <Pickup/>;
    case "bowl":return <Bowl/>;
    case "blessing-bags":return <Blessing/>;
    case "verses":return <Verses/>;
    case "reviews":return <Reviews searchParams={searchParams}/>;
    default:notFound();
  }
}
