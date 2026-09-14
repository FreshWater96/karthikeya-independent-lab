import { HttpError } from "./auth";
export async function boundedBody(request:Request,max:number) {
  const declared=Number(request.headers.get("content-length"));
  if(Number.isFinite(declared) && declared>max) throw new HttpError(413,"This file exceeds the upload limit.");
  const reader=request.body?.getReader(); if(!reader) throw new HttpError(400,"The request body is empty.");
  const chunks:Uint8Array[]=[]; let total=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw new HttpError(413,"This file exceeds the upload limit.");}chunks.push(value);}}
  finally{reader.releaseLock();}
  return Buffer.concat(chunks,total);
}
export async function readJson(request:Request) {
  try{return JSON.parse((await boundedBody(request,512*1024)).toString("utf8"));}
  catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,"The request is not valid JSON.");}
}
