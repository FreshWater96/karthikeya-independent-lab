import {z} from "zod";
import {requireOwner,rateLimit,errorResponse,HttpError} from "@/lib/auth";
import {boundedBody} from "@/lib/body";
import {db,transaction} from "@/lib/db";
import {prepareAsset} from "@/lib/storage";
import {listAssets,lockedEntry} from "@/lib/entry-service";
export const runtime="nodejs";
export async function GET(request:Request){
  try{await requireOwner();const id=z.string().uuid().parse(new URL(request.url).searchParams.get("entry"));
    return Response.json({assets:await listAssets(id)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return errorResponse(e);}
}
export async function POST(request:Request){
  try{
    const session=await requireOwner(request);await rateLimit(session.token_hash+":upload",60,3600);
    const query=new URL(request.url).searchParams;
    const parsed=z.object({entry:z.string().uuid(),role:z.enum(["cover","gallery","pdf","portrait","cv"]),revision:z.coerce.number().int().positive()}).safeParse(Object.fromEntries(query));
    if(!parsed.success)throw new HttpError(400,"Choose an entry and a valid attachment role.");
    const {entry:id,role,revision}=parsed.data;
    const row=(await db().query("SELECT kind,revision FROM entries WHERE id=$1",[id])).rows[0];
    if(!row)throw new HttpError(404,"Entry not found.");
    if(row.revision!==revision)throw new HttpError(409,"Save or reload your draft before uploading.");
    const roles=row.kind==="settings"?["portrait","cv"]:row.kind==="paper"?["cover","gallery","pdf"]:["cover","gallery"];
    if(!roles.includes(role))throw new HttpError(400,"This file role is not supported for this entry.");
    const buffer=await boundedBody(request,["pdf","cv"].includes(role)?15*1024*1024:10*1024*1024);
    let filename="attachment";try{filename=decodeURIComponent(request.headers.get("x-file-name")||"attachment");}catch{}
    const asset=await prepareAsset(buffer,role,filename);
    const updated=await transaction(async c=>{
      const current=await lockedEntry(c,id,revision);
      if(current.draft.assets.length>=40)throw new HttpError(400,"Maximum 40 attachments per entry.");
      await c.query("INSERT INTO assets(id,entry_id,mime,filename,bytes,variants) VALUES($1,$2,$3,$4,$5,$6)",[asset.id,id,asset.mime,asset.filename,asset.bytes,JSON.stringify(asset.variants)]);
      const refs=role==="gallery"?current.draft.assets:current.draft.assets.filter(a=>a.role!==role);
      const data={...current.draft,assets:[...refs,{id:asset.id,role,alt:"",caption:""}]};
      const result=await c.query("UPDATE entries SET draft=$2,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[id,JSON.stringify(data)]);
      for(const v of Object.values(asset.variants))await c.query("DELETE FROM object_gc WHERE object_key=$1",[v.key]);
      return result.rows[0];
    });
    return Response.json({entry:updated,assetId:asset.id},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
