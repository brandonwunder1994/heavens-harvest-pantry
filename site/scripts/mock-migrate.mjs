import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const url=process.env.VERCEL_ENV==="preview"?process.env.REVIEW_DATABASE_URL:process.env.DATABASE_URL;
if (process.env.VERCEL_ENV==='preview') {
  console.log('Preview uses the existing review schema; no schema writes are attempted.');
} else if (!url) {
  if (process.env.VERCEL_ENV==="production") throw new Error("Practice database migration needs DATABASE_URL");
  console.log("Practice database migration skipped: no database configured.");
} else {
  const sql=neon(url);
  const schema=readFileSync(new URL("./mock-schema.sql",import.meta.url),"utf8");
  const statements=schema.match(/(?:[^;$]|\$(?!\$)|\$\$[\s\S]*?\$\$)+;/g)??[];
  for (const statement of statements) await sql.query(statement);
  console.log("Practice-only database tables ready.");
}
