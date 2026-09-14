import {Readable} from "node:stream";
import {z} from "zod";
import {db} from "@/lib/db";
import {owner,publicAccess,errorResponse,HttpError} from "@/lib/auth";
import {objectBody,type Variants} from "@/lib/storage";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const parsed=z.string().uuid().safeParse((await params).id);
    if(!parsed.success)throw new HttpError(404,"File not found.");
    const session=await owner();
    if(!session && !(await publicAccess()))throw new HttpError(404,"File not found.");
    if(!process.env.DATABASE_URL)throw new HttpError(404,"File not found.");
    const result=await db().query("SELECT a.*,e.published FROM assets a JOIN entries e ON e.id=a.entry_id WHERE a.id=$1",[parsed.data]);
    const row=result.rows[0];
    if(!row || (!session && !row.published?.assets?.some((a:{id:string})=>a.id===row.id)))throw new HttpError(404,"File not found.");
    const variants=row.variants as Variants,query=new URL(request.url).searchParams;
    const width=query.get("w")||"1280",variant=variants[width]||variants.original||variants["1280"];
    if(!variant)throw new HttpError(404,"File not found.");
    const object=await objectBody(variant.key);
    if(!object.Body)throw new HttpError(404,"File not found.");
    const pdf=row.mime==="application/pdf",name=pdf?row.filename.replace(/\.pdf$/i,"")+".pdf":row.filename.replace(/\.[^.]+$/,"")+".webp";
    const disposition=query.get("download")==="1"?"attachment":"inline";
    return new Response(Readable.toWeb(object.Body as Readable) as ReadableStream,{
      headers:{"Content-Type":row.mime,"Content-Length":String(object.ContentLength||row.bytes),
        "Content-Disposition":disposition+"; filename*=UTF-8''"+encodeURIComponent(name),
        "Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow, noarchive","X-Content-Type-Options":"nosniff",
        ...(pdf?{"Content-Security-Policy":"sandbox; default-src 'none'; frame-ancestors 'self'"}:{})}});
  }catch(e){return errorResponse(e);}
}
