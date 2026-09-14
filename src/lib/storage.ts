import "server-only";
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import sharp from "sharp";
import {randomUUID} from "node:crypto";
import {db} from "./db";
import {HttpError} from "./auth";
export const storageReady=()=>!!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
let client:S3Client|undefined;
export function s3(){
  if(!storageReady())throw new HttpError(503,"Private file storage has not been configured.");
  return client??=new S3Client({region:process.env.S3_REGION||"us-east-1",endpoint:process.env.S3_ENDPOINT||undefined,
    forcePathStyle:process.env.S3_FORCE_PATH_STYLE==="true",
    credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID!,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY!}});
}
export type Variants=Record<string,{key:string;width?:number;height?:number}>;
export async function prepareAsset(buffer:Buffer,role:string,filename:string) {
  const id=randomUUID(), parts:{key:string;body:Buffer;mime:string;variant:string;width?:number;height?:number}[]=[];
  if(["pdf","cv"].includes(role)) {
    if(buffer.length>15*1024*1024)throw new HttpError(413,"PDFs must be 15 MB or smaller.");
    if(buffer.subarray(0,5).toString()!=="%PDF-" || !buffer.subarray(-2048).toString().includes("%%EOF"))throw new HttpError(415,"This file is not a complete PDF.");
    const {PDFDocument}=await import("pdf-lib");
    try{const document=await PDFDocument.load(buffer,{ignoreEncryption:false,updateMetadata:false});if(!document.getPageCount())throw new Error("empty");}
    catch{throw new HttpError(415,"This PDF could not be read. Use a valid, unencrypted PDF.");}
    parts.push({key:"assets/"+id+"/document.pdf",body:buffer,mime:"application/pdf",variant:"original"});
  } else {
    if(buffer.length>10*1024*1024)throw new HttpError(413,"Images must be 10 MB or smaller.");
    try {
      const input=sharp(buffer,{limitInputPixels:24000000,animated:false,failOn:"error"}),meta=await input.metadata();
      if(!meta.format || !["jpeg","png","webp"].includes(meta.format) || (meta.pages||1)>1)throw new Error("format");
      for(const size of [640,1280,1920]) {
        const {data,info}=await sharp(buffer,{limitInputPixels:24000000}).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:84}).toBuffer({resolveWithObject:true});
        parts.push({key:"assets/"+id+"/"+size+".webp",body:data,mime:"image/webp",variant:String(size),width:info.width,height:info.height});
      }
    }catch{throw new HttpError(415,"Use a valid single-frame JPG, PNG, or WebP image under 24 megapixels. SVG and AVIF are not accepted.");}
  }
  const variants:Variants={};
  // Queue keys before writes so interrupted uploads can be cleaned safely after one hour.
  for(const part of parts) {
    await db().query("INSERT INTO object_gc(object_key) VALUES($1) ON CONFLICT DO NOTHING",[part.key]);
    await s3().send(new PutObjectCommand({Bucket:process.env.S3_BUCKET!,Key:part.key,Body:part.body,ContentType:part.mime,CacheControl:"private, no-store"}));
    variants[part.variant]={key:part.key,width:part.width,height:part.height};
  }
  const safeName=filename.replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,150)||"attachment";
  return {id,variants,mime:parts[0].mime,bytes:buffer.length,filename:safeName};
}
export async function objectBody(key:string) {
  return s3().send(new GetObjectCommand({Bucket:process.env.S3_BUCKET!,Key:key}));
}
export async function deleteQueuedObjects() {
  const rows=await db().query("SELECT object_key FROM object_gc WHERE created_at<now()-interval '1 hour' LIMIT 50");
  for(const row of rows.rows) {
    const used=await db().query("SELECT 1 FROM assets WHERE variants::text LIKE $1 LIMIT 1",["%"+row.object_key+"%"]);
    if(used.rowCount)continue;
    await s3().send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET!,Key:row.object_key}));
    await db().query("DELETE FROM object_gc WHERE object_key=$1",[row.object_key]);
  }
}
