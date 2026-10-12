import {isSignedIn} from "@/lib/owner-auth";
import {readFile} from "node:fs/promises";
import path from "node:path";
import media from "@/lib/founder-guide-images.json";
export async function GET(_request:Request,{params}:{params:Promise<{name:string}>}){if(!(await isSignedIn()))return new Response("Sign in first",{status:401});const {name}=await params;if(!Object.values(media).includes(name))return new Response("Not found",{status:404});try{const file=await readFile(path.join(process.cwd(),"private/handoff",`${name}.png`));return new Response(file,{headers:{"Content-Type":"image/png","Cache-Control":"private, no-store"}});}catch{return new Response("Not found",{status:404});}}
