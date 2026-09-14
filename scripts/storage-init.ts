import {S3Client,CreateBucketCommand,HeadBucketCommand,GetBucketPolicyStatusCommand,GetBucketAclCommand} from "@aws-sdk/client-s3";
const client=new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||"us-east-1",forcePathStyle:process.env.S3_FORCE_PATH_STYLE==="true",credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID!,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY!}});
const Bucket=process.env.S3_BUCKET!;
if(!Bucket)throw new Error("S3_BUCKET is required.");
let available=false;
for(let attempt=0;attempt<20;attempt++){
  try{await client.send(new HeadBucketCommand({Bucket}));available=true;break;}
  catch(error){const e=error as {$metadata?:{httpStatusCode?:number}};if(e.$metadata?.httpStatusCode===404){await client.send(new CreateBucketCommand({Bucket,...((process.env.S3_REGION||"us-east-1")!=="us-east-1"?{CreateBucketConfiguration:{LocationConstraint:process.env.S3_REGION as never}}:{})}));available=true;break;}
    if(e.$metadata?.httpStatusCode===403)throw new Error("Storage credentials cannot access the configured bucket.");
    await new Promise(r=>setTimeout(r,1000));}
}
if(!available)throw new Error("Storage is not reachable.");
try{
  const policy=await client.send(new GetBucketPolicyStatusCommand({Bucket}));
  if(policy.PolicyStatus?.IsPublic)throw new Error("Refusing a public bucket. Disable its public access first.");
}catch(error){
  const e=error as {name?:string;$metadata?:{httpStatusCode?:number}};
  if(!["NoSuchBucketPolicy","NotImplemented"].includes(e.name||"") && ![404,501].includes(e.$metadata?.httpStatusCode||0))throw error;
}
try{
  const acl=await client.send(new GetBucketAclCommand({Bucket}));
  if(acl.Grants?.some(g=>g.Grantee?.URI?.includes("AllUsers")||g.Grantee?.URI?.includes("AuthenticatedUsers")))throw new Error("Refusing a publicly readable bucket ACL.");
}catch(error){
  const e=error as {name?:string;$metadata?:{httpStatusCode?:number}};
  if(e.name!=="NotImplemented"&&e.$metadata?.httpStatusCode!==501)throw error;
}
console.log("Private bucket ready. For hosted storage, keep all public-access features disabled.");
