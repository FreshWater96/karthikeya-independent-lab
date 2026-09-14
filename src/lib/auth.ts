import "server-only";
import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { isOwnerId } from "./model";
export const siteOrigin = () => new URL(process.env.SITE_URL || "http://127.0.0.1:3000").origin;
export const secureCookies = () => siteOrigin().startsWith("https://");
export const sessionCookie = () => secureCookies() ? "__Host-lab-session" : "lab-session";
export const oauthCookie = () => secureCookies() ? "__Host-lab-oauth" : "lab-oauth";
export const cookieOptions = () => ({httpOnly:true,secure:secureCookies(),sameSite:"lax" as const,path:"/"});
export const hash = (s:string) => createHash("sha256").update(s).digest("hex");
export const secretKey = () => createHash("sha256").update(process.env.AUTH_SECRET || "").digest();
export function authReady() {
  const validTransport = secureCookies() || ["127.0.0.1","localhost","[::1]"].includes(new URL(siteOrigin()).hostname);
  return !!(validTransport && process.env.DATABASE_URL && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET &&
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32 && /^\d+$/.test(process.env.OWNER_GITHUB_ID || ""));
}
export type OwnerSession = {token_hash:string;owner_id:string};
export async function owner():Promise<OwnerSession|null> {
  if(!authReady()) return null;
  const token=(await cookies()).get(sessionCookie())?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const r=await db().query("SELECT token_hash,owner_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",[hash(token)]);
  const s=r.rows[0] as OwnerSession|undefined;
  return s && isOwnerId(s.owner_id,process.env.OWNER_GITHUB_ID) ? s : null;
}
export async function createSession(ownerId:string) {
  if(!isOwnerId(ownerId,process.env.OWNER_GITHUB_ID)) throw new HttpError(403,"This account is not the configured owner.");
  const token=randomBytes(32).toString("hex");
  await db().query("DELETE FROM sessions WHERE expires_at<now()");
  await db().query("INSERT INTO sessions(token_hash,owner_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",[hash(token),ownerId]);
  (await cookies()).set(sessionCookie(),token,{...cookieOptions(),maxAge:43200});
}
export const csrfToken=(s:OwnerSession) => createHmac("sha256",secretKey()).update("csrf:"+s.token_hash).digest("hex");
export const equal=(a:string,b:string) => {const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length && timingSafeEqual(left,right);};
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export async function requireOwner(request?:Request) {
  const s=await owner(); if(!s) throw new HttpError(401,"Owner authentication required.");
  if(request && !["GET","HEAD"].includes(request.method)) {
    const origin=request.headers.get("origin");
    if(origin!==siteOrigin() || request.headers.get("sec-fetch-site")==="cross-site") throw new HttpError(403,"Cross-site request rejected.");
    if(!equal(request.headers.get("x-csrf-token")||"",csrfToken(s))) throw new HttpError(403,"Your security token expired. Refresh the studio.");
  }
  return s;
}
export async function rateLimit(key:string,limit:number,seconds:number) {
  const bucket=Math.floor(Date.now()/1000/seconds);
  const r=await db().query(
    "INSERT INTO rate_limits(rate_key,hits,reset_at) VALUES($1,1,to_timestamp($2)) ON CONFLICT(rate_key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits",
    [key+":"+bucket,(bucket+1)*seconds]);
  if(r.rows[0].hits>limit) throw new HttpError(429,"Too many requests. Please try again shortly.");
}
export function errorResponse(error:unknown) {
  if(error instanceof HttpError) return Response.json({error:error.message},{status:error.status,headers:{"Cache-Control":"no-store"}});
  if(error && typeof error==="object" && "code" in error && error.code==="23505") return Response.json({error:"That URL slug already exists."},{status:409});
  // Do not log request bodies, OAuth codes, storage credentials, or cookies.
  return Response.json({error:"The operation could not finish. Check the database or storage connection and try again."},{status:503,headers:{"Cache-Control":"no-store"}});
}
export const publicAccess = async () => process.env.SITE_MODE==="public" || process.env.NODE_ENV==="development" || !!(await owner());
