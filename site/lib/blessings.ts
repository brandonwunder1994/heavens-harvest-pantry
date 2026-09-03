/**
 * The blessing map — one warm point for every bag that has gone out.
 *
 * There are no names on it and no addresses in it. A point is not where
 * somebody lives: it is a dot scattered inside the shape of a delivery area,
 * placed from the payment's own id so it stays where it was put and moves for
 * nobody. Two bags to the same porch are two points in different places.
 *
 * It will look like almost nothing for a long time. That is the point of
 * putting it in now — it fills itself, and a year from now it is a year of
 * her Tuesdays.
 *
 * Import-free, so `node --test` runs it directly.
 */

export type Given = {
  /** The payment's own id. Used only to place the dot; never shown. */
  id: string;
  area: string;
  bags: number;
  at: number;
};

export type Light = {
  /** Where inside the area's circle, as a fraction of its radius. */
  x: number;
  y: number;
  /** 0 for today, 1 for a year ago. Older lights are drawn fainter. */
  age: number;
};

export type Field = {
  area: string;
  lights: Light[];
  bags: number;
};

const YEAR = 365 * 86_400_000;

/** A number between 0 and 1 from a string, the same one every time. */
function hash(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Every bag as a point, grouped by the area it went to.
 *
 * Areas are handed in rather than read off the orders, so the map shows her
 * rounds — including a round nobody has ordered from yet, which is a truer
 * picture than a map that quietly forgets Anthem exists.
 */
export function fieldsFor(given: Given[], areas: string[], now = Date.now()): Field[] {
  const byArea = new Map<string, Field>();
  for (const area of areas) byArea.set(area.toLowerCase(), { area, lights: [], bags: 0 });

  for (const one of given) {
    const field = byArea.get(String(one.area ?? "").trim().toLowerCase());
    if (!field) continue;

    const bags = Math.max(0, Math.floor(Number(one.bags) || 0));
    if (!bags) continue;
    field.bags += bags;

    const age = Math.min(1, Math.max(0, (now - one.at) / YEAR));

    for (let i = 0; i < Math.min(bags, 24); i++) {
      const rnd = hash(`${one.id}:${i}`);
      // Scattered over the disc rather than over a square, and biased away
      // from the very middle so a busy area does not become one blob.
      const angle = rnd() * Math.PI * 2;
      const far = 0.28 + Math.sqrt(rnd()) * 0.66;
      field.lights.push({
        x: Math.cos(angle) * far,
        y: Math.sin(angle) * far * 0.82,
        age,
      });
    }
  }

  return areas.map((area) => byArea.get(area.toLowerCase())!);
}

/** "Fourteen bags" / "One bag" / "No bags yet". */
export function countedIn(fields: Field[]): number {
  return fields.reduce((n, f) => n + f.bags, 0);
}
