import "server-only";
import { Pool, type PoolClient } from "pg";
import type { Entry, EntryData, Kind, PublicEntry } from "./model";
import { defaults, SETTINGS_ID } from "./model";
const globalDb = globalThis as unknown as {labPool?:Pool};
export const db = () => {
  if(!process.env.DATABASE_URL) throw new Error("Database is not configured.");
  return globalDb.labPool ??= new Pool({connectionString:process.env.DATABASE_URL,max:6,connectionTimeoutMillis:5000,idleTimeoutMillis:20000});
};
export async function transaction<T>(fn:(c:PoolClient)=>Promise<T>) {
  const c=await db().connect();
  try {await c.query("BEGIN"); const value=await fn(c); await c.query("COMMIT"); return value;}
  catch(e){await c.query("ROLLBACK"); throw e;} finally{c.release();}
}
export async function publicEntries(kind:Kind):Promise<PublicEntry[]> {
  if(!process.env.DATABASE_URL) return [];
  const r=await db().query("SELECT id,kind,slug,published AS data,published_at FROM entries WHERE kind=$1 AND published IS NOT NULL ORDER BY (published->>'featured')::boolean DESC,(published->>'order')::integer ASC,published_at DESC",[kind]);
  return r.rows;
}
export async function publicEntry(kind:Kind,slug:string):Promise<PublicEntry|null> {
  if(!process.env.DATABASE_URL) return null;
  const r=await db().query("SELECT id,kind,slug,published AS data,published_at FROM entries WHERE kind=$1 AND slug=$2 AND published IS NOT NULL",[kind,slug]);
  return r.rows[0]??null;
}
export async function settings():Promise<EntryData> {
  if(!process.env.DATABASE_URL) return defaults;
  const r=await db().query("SELECT published FROM entries WHERE id=$1",[SETTINGS_ID]);
  return r.rows[0]?.published??defaults;
}
export async function draftEntry(id:string):Promise<Entry|null> {
  const r=await db().query("SELECT * FROM entries WHERE id=$1",[id]); return r.rows[0]??null;
}
