/**
 * What an owner form knows about its last save. Kept out of the actions file
 * because a "use server" module may only export functions, and this is a value.
 */
export type SaveState = { ok: boolean; message: string };

export const idle: SaveState = { ok: true, message: "" };
