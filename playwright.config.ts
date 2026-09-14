import {defineConfig,devices} from "@playwright/test";
import {existsSync} from "node:fs";
if(existsSync(".env.local"))process.loadEnvFile(".env.local");
export default defineConfig({
  testDir:"./tests/e2e",fullyParallel:false,workers:1,timeout:60000,
  expect:{timeout:10000},reporter:[["list"],["html",{open:"never"}]],
  use:{baseURL:"http://127.0.0.1:3100",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:[
    {command:"npx next start --hostname 127.0.0.1 --port 3100",url:"http://127.0.0.1:3100",reuseExistingServer:false,timeout:60000,env:{...process.env,SITE_URL:"http://127.0.0.1:3100",SITE_MODE:"public",NODE_ENV:"production"}},
    {command:"npx next start --hostname 127.0.0.1 --port 3200",url:"http://127.0.0.1:3200",reuseExistingServer:false,timeout:60000,env:{...process.env,SITE_URL:"http://127.0.0.1:3200",SITE_MODE:"preview",NODE_ENV:"production"}}
  ]
});
