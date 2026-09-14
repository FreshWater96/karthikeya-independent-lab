import {Pool} from "pg";
import {S3Client,DeleteObjectCommand} from "@aws-sdk/client-s3";
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const client=new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||"us-east-1",forcePathStyle:process.env.S3_FORCE_PATH_STYLE==="true",credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID!,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY!}});
try{
  const result=await pool.query("SELECT object_key FROM object_gc WHERE created_at<now()-interval '1 hour' ORDER BY created_at LIMIT 500");
  let deleted=0;
  for(const row of result.rows){
    const used=await pool.query("SELECT 1 FROM assets WHERE variants::text LIKE $1 LIMIT 1",["%"+row.object_key+"%"]);
    if(used.rowCount)continue;
    await client.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET!,Key:row.object_key}));
    await pool.query("DELETE FROM object_gc WHERE object_key=$1",[row.object_key]);deleted++;
  }
  await pool.query("DELETE FROM rate_limits WHERE reset_at<now()");
  await pool.query("DELETE FROM sessions WHERE expires_at<now()");
  console.log("Removed "+deleted+" objects already queued for deletion or abandoned during upload.");
}finally{await pool.end();}
