import "server-only";
import {db,transaction} from "./db";
import {type Entry,type EntryData,publicationIssues,SETTINGS_ID} from "./model";
import {HttpError} from "./auth";
import type {PoolClient} from "pg";
async function validateAssets(c:PoolClient,id:string,data:EntryData) {
  const ids=data.assets.map(a=>a.id);
  if(new Set(ids).size!==ids.length)throw new HttpError(400,"An attachment was included more than once.");
  if(!ids.length)return;
  const found=await c.query("SELECT id,mime FROM assets WHERE entry_id=$1 AND id=ANY($2::uuid[])",[id,ids]);
  if(found.rowCount!==ids.length)throw new HttpError(400,"An attachment is missing or belongs to another entry.");
  for(const ref of data.assets) {
    const asset=found.rows.find(a=>a.id===ref.id);
    if((["pdf","cv"].includes(ref.role))!==(asset.mime==="application/pdf"))throw new HttpError(400,"The attachment type does not match its role.");
  }
}
export async function lockedEntry(c:PoolClient,id:string,revision:number) {
  const result=await c.query("SELECT * FROM entries WHERE id=$1 FOR UPDATE",[id]);
  const row=result.rows[0] as Entry|undefined;
  if(!row)throw new HttpError(404,"Entry not found.");
  if(row.revision!==revision)throw new HttpError(409,"This entry changed in another tab. Reload before saving.");
  return row;
}
export async function saveEntry(id:string,revision:number,slug:string,data:EntryData) {
  return transaction(async c=>{
    const row=await lockedEntry(c,id,revision);
    if(row.published && row.slug!==slug)throw new HttpError(409,"Unpublish this entry before changing its URL.");
    if(id===SETTINGS_ID && slug!=="site")throw new HttpError(400,"The site-settings URL cannot change.");
    await validateAssets(c,id,data);
    const roles=row.kind==="settings"?["portrait","cv"]:row.kind==="paper"?["cover","gallery","pdf"]:["cover","gallery"];
    if(data.assets.some(a=>!roles.includes(a.role)))throw new HttpError(400,"Unsupported attachment role.");
    const result=await c.query("UPDATE entries SET slug=$2,draft=$3,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[id,slug,JSON.stringify(data)]);
    return result.rows[0] as Entry;
  });
}
export async function publishEntry(id:string,revision:number,publish:boolean) {
  return transaction(async c=>{
    const row=await lockedEntry(c,id,revision);
    if(publish) {
      const issues=publicationIssues(row.kind,row.draft);
      if(issues.length)throw new HttpError(400,issues.join(" "));
      await validateAssets(c,id,row.draft);
    }
    const result=await c.query("UPDATE entries SET published=$2,published_at=$3,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",
      [id,publish?JSON.stringify(row.draft):null,publish?new Date():null]);
    return result.rows[0] as Entry;
  });
}
export async function removeEntry(id:string,revision:number,confirmation:string) {
  if(id===SETTINGS_ID)throw new HttpError(400,"Site settings cannot be deleted.");
  await transaction(async c=>{
    const row=await lockedEntry(c,id,revision);
    if(confirmation!==(row.draft.title||row.slug))throw new HttpError(400,"The confirmation text does not match.");
    const assets=await c.query("SELECT variants FROM assets WHERE entry_id=$1",[id]);
    for(const asset of assets.rows)for(const v of Object.values(asset.variants) as {key:string}[])await c.query("INSERT INTO object_gc(object_key) VALUES($1) ON CONFLICT DO NOTHING",[v.key]);
    await c.query("DELETE FROM entries WHERE id=$1",[id]);
  });
}
export async function listAssets(entryId:string) {
  const r=await db().query("SELECT id,mime,filename,bytes,created_at FROM assets WHERE entry_id=$1 ORDER BY created_at DESC",[entryId]);return r.rows;
}
