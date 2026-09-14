import { jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { authReady,siteOrigin,secretKey,oauthCookie,cookieOptions,equal,createSession } from "@/lib/auth";
import { isOwnerId } from "@/lib/model";
export const runtime="nodejs";
export async function GET(request:Request) {
  const jar=await cookies(), sealed=jar.get(oauthCookie())?.value;
  jar.set(oauthCookie(),"",{...cookieOptions(),maxAge:0});
  try {
    if(!authReady() || !sealed) throw new Error("locked");
    const url=new URL(request.url), state=url.searchParams.get("state")||"",code=url.searchParams.get("code")||"";
    const {payload}=await jwtDecrypt(sealed,secretKey(),{issuer:"independent-lab",audience:"github-oauth"});
    if(typeof payload.state!=="string" || typeof payload.verifier!=="string" || !equal(state,payload.state) || !code || code.length>512) throw new Error("state");
    const exchange=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({client_id:process.env.GITHUB_CLIENT_ID!,client_secret:process.env.GITHUB_CLIENT_SECRET!,code,
        redirect_uri:siteOrigin()+"/api/auth/callback/github",code_verifier:payload.verifier}),cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!exchange.ok) throw new Error("exchange");
    const token=await exchange.json();
    if(typeof token.access_token!=="string") throw new Error("exchange");
    const profileResponse=await fetch("https://api.github.com/user",{headers:{Authorization:"Bearer "+token.access_token,Accept:"application/vnd.github+json","User-Agent":"Karthikeya-Independent-Lab"},cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!profileResponse.ok) throw new Error("identity");
    const profile=await profileResponse.json();
    if(!isOwnerId(profile.id,process.env.OWNER_GITHUB_ID)) return Response.redirect(siteOrigin()+"/studio?error=not-owner",303);
    await createSession(String(profile.id));
    return Response.redirect(siteOrigin()+"/studio",303);
  }catch{return Response.redirect(siteOrigin()+"/studio?error=signin-failed",303);}
}
