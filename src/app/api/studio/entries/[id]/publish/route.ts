import {z} from "zod";
import {requireOwner,errorResponse,HttpError} from "@/lib/auth";
import {readJson} from "@/lib/body";
import {publishEntry} from "@/lib/entry-service";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireOwner(request);
    const id=z.string().uuid().parse((await params).id);
    const parsed=z.object({revision:z.number().int().positive(),publish:z.boolean()}).strict().safeParse(await readJson(request));
    if(!parsed.success)throw new HttpError(400,"Invalid publication request.");
    return Response.json({entry:await publishEntry(id,parsed.data.revision,parsed.data.publish)},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
