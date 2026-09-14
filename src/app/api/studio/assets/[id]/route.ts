import {z} from "zod";
import {requireOwner,errorResponse,HttpError} from "@/lib/auth";
import {transaction} from "@/lib/db";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireOwner(request);const id=z.string().uuid().parse((await params).id);
    await transaction(async c=>{
      const result=await c.query("SELECT a.variants,e.draft,e.published FROM assets a JOIN entries e ON e.id=a.entry_id WHERE a.id=$1 FOR UPDATE OF e",[id]);
      const row=result.rows[0];if(!row)throw new HttpError(404,"File not found.");
      if([...row.draft.assets,...(row.published?.assets||[])].some((a:{id:string})=>a.id===id))throw new HttpError(409,"Remove this file from the draft and published version before deleting it.");
      for(const v of Object.values(row.variants) as {key:string}[])await c.query("INSERT INTO object_gc(object_key) VALUES($1) ON CONFLICT DO NOTHING",[v.key]);
      await c.query("DELETE FROM assets WHERE id=$1",[id]);
    });
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
