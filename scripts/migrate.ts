import {Pool} from "pg";
import {readFile} from "node:fs/promises";
import {defaults,SETTINGS_ID} from "../src/lib/model";
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(await readFile(new URL("./schema.sql",import.meta.url),"utf8"));
  await client.query("INSERT INTO entries(id,kind,slug,draft) VALUES($1,'settings','site',$2) ON CONFLICT DO NOTHING",[SETTINGS_ID,JSON.stringify(defaults)]);
  await client.query("DELETE FROM sessions WHERE expires_at<now()");
  await client.query("DELETE FROM rate_limits WHERE reset_at<now()");
  await client.query("COMMIT");
  console.log("Schema ready. No project or research content was seeded.");
} catch(e){await client.query("ROLLBACK");throw e;} finally{client.release();await pool.end();}
