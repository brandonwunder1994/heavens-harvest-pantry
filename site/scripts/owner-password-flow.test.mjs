import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { randomBytes, scryptSync } from "node:crypto";

// Exercise the real auth and server action with an isolated store and cookie jar.
// No external service or production credential is used by these tests.
const state = globalThis.__ownerPasswordTest = { rows: [], cookie: undefined, writes: 0, fail: false };
const modules = {
  "server-only": "export {};",
  "next/headers": `export async function headers(){return new Headers({'x-forwarded-for':'password-flow-test'})} export async function cookies(){const s=globalThis.__ownerPasswordTest;return {get:()=>s.cookie?{value:s.cookie}:undefined,set:(_name,value)=>{s.cookie=value},delete:()=>{s.cookie=undefined}}}`,
  "next/navigation": `export function redirect(url){throw new Error('REDIRECT:'+url)}`,
  "@/lib/handoff-sample": "export const guideSample=false;",
  "@/lib/db": `export const databaseReady=true; export function sql(){return async (strings,...values)=>globalThis.__ownerPasswordTest.query(strings.join('?'),values)}`,
};
registerHooks({ resolve(specifier, context, next) {
  if (specifier in modules) return { url: "data:text/javascript," + encodeURIComponent(modules[specifier]), shortCircuit: true };
  return next(specifier, context);
} });

state.query = async (query, values) => {
  if (state.fail) throw new Error("Isolated store unavailable");
  if (query.includes("with changed as")) {
    const [replacement, secret, id, oldHash] = values;
    const target = state.rows.find(row => row.id === id && row.password_hash === oldHash);
    const root = state.rows.find(row => row.id === 1);
    if (!target || !root) return [];
    target.password_hash = replacement;
    root.session_secret = secret;
    state.writes++;
    return [{ id }];
  }
  if (query.includes("where lower(trim(username))")) return state.rows.filter(row => row.username.toLowerCase() === values[0]);
  if (query.includes("where id = 1")) return state.rows.filter(row => row.id === 1);
  return state.rows;
};

const auth = await import("../lib/owner-auth.ts");
const { changePassword } = await import("../app/owner/change-password/actions.ts");
const hash = password => { const salt=randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password,salt,64).toString("hex")}`; };
async function setup() {
  state.rows = [{id:1,username:"owner",password_hash:hash("temp"),session_secret:randomBytes(32).toString("hex")},{id:2,username:"helper",password_hash:hash("helper old password")}];
  state.writes=0;state.fail=false;
  state.cookie = await auth.createToken();
}
const input = {username:"owner",currentPassword:"temp",newPassword:"my new pantry password",confirmPassword:"my new pantry password"};

test("password mutation requires a signed-in session and correct current credentials", async () => {
  await setup(); state.cookie=undefined;
  assert.equal((await auth.changeOwnerPassword(input)).ok,false);
  state.cookie=await auth.createToken();
  assert.equal((await auth.changeOwnerPassword({...input,currentPassword:"wrong"})).ok,false);
  assert.equal((await auth.changeOwnerPassword({...input,username:"unknown"})).ok,false);
  assert.equal((await auth.changeOwnerPassword({...input,confirmPassword:"mismatch"})).ok,false);
  assert.equal(state.writes,0);
});
test("a successful action signs out, replaces only the selected password, and invalidates old sessions", async () => {
  await setup(); const oldSession=state.cookie;const helperHash=state.rows[1].password_hash;
  const form=new FormData();for(const [key,value] of Object.entries(input))form.set(key,value);
  await assert.rejects(changePassword({ok:false,message:""},form),/REDIRECT:\/owner\/login\?password=changed/);
  assert.equal(state.cookie,undefined);
  assert.equal(await auth.tokenIsValid(oldSession),false);
  assert.equal(await auth.verifyCredentials("owner","temp"),false);
  assert.equal(await auth.verifyCredentials(" OWNER ",input.newPassword),true);
  assert.equal(state.rows[1].password_hash,helperHash);
  assert.equal(state.writes,1);
});
test("changing a secondary account rotates the shared session without changing the primary password", async () => {
  await setup();const oldSession=state.cookie;const primaryHash=state.rows[0].password_hash;
  assert.equal((await auth.changeOwnerPassword({...input,username:"helper",currentPassword:"helper old password"})).ok,true);
  assert.equal(state.rows[0].password_hash,primaryHash);
  assert.equal(await auth.verifyCredentials("helper",input.newPassword),true);
  assert.equal(await auth.tokenIsValid(oldSession),false);
});
test("an unavailable store never reports success or performs a write", async () => {
  await setup();state.fail=true;
  assert.equal((await auth.changeOwnerPassword(input)).ok,false);
  assert.equal(state.writes,0);state.fail=false;
});
