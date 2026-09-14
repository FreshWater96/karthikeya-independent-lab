import {cookies} from "next/headers";
import {requireOwner,sessionCookie,cookieOptions,errorResponse} from "@/lib/auth";
import {db} from "@/lib/db";
export async function POST(request:Request) {
  try{
    const s=await requireOwner(request);
    await db().query("DELETE FROM sessions WHERE token_hash=$1",[s.token_hash]);
    (await cookies()).set(sessionCookie(),"",{...cookieOptions(),maxAge:0});
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
