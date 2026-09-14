import { randomBytes, createHash } from "node:crypto";
import { EncryptJWT } from "jose";
import { cookies } from "next/headers";
import { authReady,siteOrigin,secretKey,oauthCookie,cookieOptions,rateLimit,errorResponse,HttpError } from "@/lib/auth";
export const runtime="nodejs";
export async function GET() {
  try {
    if(!authReady()) throw new HttpError(503,"Owner login is locked until the server environment is configured.");
    await rateLimit("oauth-login",60,60);
    const state=randomBytes(32).toString("hex"), verifier=randomBytes(32).toString("base64url");
    const sealed=await new EncryptJWT({state,verifier}).setProtectedHeader({alg:"dir",enc:"A256GCM"})
      .setIssuer("independent-lab").setAudience("github-oauth").setIssuedAt().setExpirationTime("10m").encrypt(secretKey());
    (await cookies()).set(oauthCookie(),sealed,{...cookieOptions(),maxAge:600});
    const url=new URL("https://github.com/login/oauth/authorize");
    url.search=new URLSearchParams({client_id:process.env.GITHUB_CLIENT_ID!,redirect_uri:siteOrigin()+"/api/auth/callback/github",
      state,scope:"read:user",allow_signup:"false",code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256"}).toString();
    return Response.redirect(url,302);
  }catch(e){return errorResponse(e);}
}
