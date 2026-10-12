import "server-only";
import { databaseReady, sql } from "@/lib/db";
import type { Review, ReviewDraft } from "@/lib/reviews";
import {guideSample} from "@/lib/handoff-sample";

/** Reading and writing reviews. All the arithmetic lives in `lib/reviews.ts`. */

type Row = {
  id: number | string;
  name: string;
  flavor: string | null;
  rating: number;
  body: string;
  approved: boolean;
  created_at: string;
};

export async function pendingReviewCount(): Promise<number | null> {
  if (guideSample) return 1;
  if (!databaseReady) return null;
  try { const rows = await sql()`select count(*)::int as count from reviews where approved = false`; return Number(rows[0].count); }
  catch { return null; }
}

const toReview = (row: Row): Review => ({
  id: Number(row.id),
  name: row.name,
  flavor: row.flavor,
  rating: Number(row.rating),
  body: row.body,
  approved: row.approved,
  createdAt: Math.floor(new Date(row.created_at).getTime() / 1000),
});

/**
 * What she sees carries a status, because "no reviews yet" and "could not read
 * the reviews" look identical on screen and mean opposite things. The public
 * page does not: an unreachable database there just shows nothing.
 */
export type ReviewsResult =
  | { status: "ok"; reviews: Review[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

/** What the public sees: only what she has approved, newest first. */
export async function publishedReviews(limit = 60): Promise<Review[]> {
  if (!databaseReady) return [];
  try {
    const rows = (await sql()`
      select id, name, flavor, rating, body, approved, created_at
      from reviews where approved = true
      order by created_at desc limit ${limit}
    `) as Row[];
    return rows.map(toReview);
  } catch (error) {
    console.error("[reviews] could not read the published reviews", error);
    return [];
  }
}

/** What she sees: everything, waiting ones first. */
export async function allReviews(limit = 200): Promise<ReviewsResult> {
  if(guideSample)return {status:"ok",reviews:[{id:0,name:"Sample Neighbor",flavor:"Apple Maple Pecan Granola",rating:5,body:"Our family loved the crunch. This is a sample review.",approved:false,createdAt:1792108800}]};
  if (!databaseReady) return { status: "not_configured" };
  try {
    const rows = (await sql()`
      select id, name, flavor, rating, body, approved, created_at
      from reviews
      order by approved asc, created_at desc limit ${limit}
    `) as Row[];
    return { status: "ok", reviews: rows.map(toReview) };
  } catch (error) {
    console.error("[reviews] could not read the reviews", error);
    return { status: "error", message: error instanceof Error ? error.message : "unknown" };
  }
}

export async function addReview(draft: ReviewDraft): Promise<void> {
  await sql()`
    insert into reviews (name, email, flavor, rating, body)
    values (${draft.name}, ${draft.email || null}, ${draft.flavor || null}, ${draft.rating}, ${draft.body})
  `;
}

export async function approve(id: number): Promise<void> {
  await sql()`update reviews set approved = true where id = ${id}`;
}

export async function remove(id: number): Promise<void> {
  await sql()`delete from reviews where id = ${id}`;
}
