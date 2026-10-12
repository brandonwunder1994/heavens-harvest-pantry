import { isSignedIn } from "@/lib/owner-auth";
import { siteUrl } from "@/lib/site-url";
import QRCode from "qrcode";
export async function GET() {
  if (!(await isSignedIn())) return new Response("Owner login required",{status:401});
  const origin=siteUrl();if(!origin)return new Response("Practice URL not configured",{status:503});
  const svg=await QRCode.toString(`${origin}/mockorder/menu`,{type:"svg",errorCorrectionLevel:"M",margin:2,color:{dark:"#5b3d1e",light:"#faf6ee"}});
  return new Response(svg,{headers:{"Content-Type":"image/svg+xml","Cache-Control":"private, no-store"}});
}
