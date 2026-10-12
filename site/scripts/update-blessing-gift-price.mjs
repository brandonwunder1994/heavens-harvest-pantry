// Run with the linked project's production environment and --apply to publish
// this specific owner-requested price change. Other settings are preserved.
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);
const blurb = "Add $7 to your chosen granola or candied almonds for a cute gift jar and anonymous delivery in Vistancia.";
if (process.argv.includes("--apply")) {
  await sql`
    insert into settings (key, value, updated_at)
    values ('blessingBag', ${JSON.stringify({ price: 7, blurb })}::jsonb, now())
    on conflict (key) do update set
      value = jsonb_set(jsonb_set(settings.value, '{price}', '7'::jsonb), '{blurb}', ${JSON.stringify(blurb)}::jsonb),
      updated_at = now()
  `;
}
const rows = await sql`select value from settings where key = 'blessingBag'`;
console.log(JSON.stringify({ blessingBag: rows[0]?.value ?? null, applied: process.argv.includes("--apply") }));
if (process.argv.includes("--apply") && (rows[0]?.value?.price !== 7 || rows[0]?.value?.blurb !== blurb)) {
  throw new Error("The live blessing gift setting did not match the requested change.");
}
