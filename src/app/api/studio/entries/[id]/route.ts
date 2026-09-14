import {z} from "zod";
import {requireOwner,rateLimit,errorResponse,HttpError} from "@/lib/auth";
import {readJson} from "@/lib/body";
import {entryDataSchema,slugSchema} from "@/lib/model";
import {saveEntry,removeEntry} from "@/lib/entry-service";
type Context={params:Promise<{id:string}>};
export async function PUT(request:Request,context:Context){
  try{
    const session=await requireOwner(request);await rateLimit(session.token_hash+":write",600,3600);
    const id=z.string().uuid().parse((await context.params).id);
    const parsed=z.object({revision:z.number().int().positive(),slug:slugSchema,data:entryDataSchema}).strict().safeParse(await readJson(request));
    if(!parsed.success)throw new HttpError(400,parsed.error.issues.map(e=>e.path.join(".")+": "+e.message).join(" "));
    return Response.json({entry:await saveEntry(id,parsed.data.revision,parsed.data.slug,parsed.data.data)},{headers:{"Cache-Control":"no-store"}});
  }catch(e){if(e instanceof z.ZodError)return Response.json({error:"Invalid entry ID."},{status:400});return errorResponse(e);}
}
export async function DELETE(request:Request,context:Context){
  try{
    await requireOwner(request);
    const id=z.string().uuid().parse((await context.params).id);
    const parsed=z.object({revision:z.number().int().positive(),confirmation:z.string().max(240)}).strict().safeParse(await readJson(request));
    if(!parsed.success)throw new HttpError(400,"Confirm the entry title before deleting.");
    await removeEntry(id,parsed.data.revision,parsed.data.confirmation);
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
