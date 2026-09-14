import {randomUUID} from "node:crypto";
import {z} from "zod";
import {db} from "@/lib/db";
import {entryDataSchema} from "@/lib/model";
import {requireOwner,csrfToken,rateLimit,errorResponse,HttpError} from "@/lib/auth";
import {readJson} from "@/lib/body";
import {storageReady} from "@/lib/storage";
export const dynamic="force-dynamic";
export async function GET(){
  try{const session=await requireOwner();const result=await db().query("SELECT * FROM entries ORDER BY kind,updated_at DESC");
    return Response.json({entries:result.rows,csrf:csrfToken(session),storageReady:storageReady()},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return errorResponse(e);}
}
export async function POST(request:Request){
  try{
    const session=await requireOwner(request);await rateLimit(session.token_hash+":create",60,3600);
    const parsed=z.object({kind:z.enum(["project","paper","lab"])}).strict().safeParse(await readJson(request));
    if(!parsed.success)throw new HttpError(400,"Choose a project, paper, or lab entry.");
    const id=randomUUID(),slug="untitled-"+id.slice(0,8),data=entryDataSchema.parse({});
    const result=await db().query("INSERT INTO entries(id,kind,slug,draft) VALUES($1,$2,$3,$4) RETURNING *",[id,parsed.data.kind,slug,JSON.stringify(data)]);
    return Response.json({entry:result.rows[0]},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
