import {isSignedIn} from "@/lib/owner-auth";
import {readFile} from "node:fs/promises";
import path from "node:path";
export async function GET(){if(!(await isSignedIn()))return new Response("Sign in first",{status:401});const file=await readFile(path.join(process.cwd(),"private/handoff/founder-guide.pdf"));return new Response(file,{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=Heavens-Harvest-Easy-Guide.pdf","Cache-Control":"private, no-store"}});}
