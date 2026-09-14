import {randomBytes} from "node:crypto";
import {writeFile,access} from "node:fs/promises";
const destination=new URL("../.env.local",import.meta.url);
try{await access(destination);console.error(".env.local already exists; it was not changed.");process.exit(1);}catch(error){if(error.code!=="ENOENT")throw error;}
const random=()=>randomBytes(32).toString("hex"),password=random(),key="lab"+randomBytes(10).toString("hex"),secret=random();
const test=process.argv.includes("--test"),database=test?"lab_test":"lab";
const content=[
"SITE_URL=http://127.0.0.1:3000","SITE_MODE=preview","AUTH_SECRET="+random(),"OWNER_GITHUB_ID=309612209",
"GITHUB_CLIENT_ID="+(test?"local-ci-placeholder":""),"GITHUB_CLIENT_SECRET="+(test?"local-ci-placeholder":""),
"POSTGRES_DB="+database,"POSTGRES_PASSWORD="+password,"DATABASE_URL=postgresql://lab:"+password+"@127.0.0.1:5433/"+database,
"S3_ENDPOINT=http://127.0.0.1:9000","S3_REGION=us-east-1","S3_BUCKET=independent-lab","S3_ACCESS_KEY_ID="+key,"S3_SECRET_ACCESS_KEY="+secret,"S3_FORCE_PATH_STYLE=true",
...(test?["LAB_TEST_DATABASE=1"]:[])
].join("\n")+"\n";
await writeFile(destination,content,{flag:"wx",mode:0o600});
console.log("Created .env.local with random local infrastructure credentials. Keep it private.");
if(!test)console.log("Next: add your GitHub OAuth app's client ID and secret to .env.local. The admin stays locked until configured.");
