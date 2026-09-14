import {test,expect,request as requestFactory,type APIRequestContext} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {Pool} from "pg";
import {randomBytes,createHash} from "node:crypto";
import sharp from "sharp";
import {PDFDocument} from "pdf-lib";
import {mkdir} from "node:fs/promises";
const origin="http://127.0.0.1:3100";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
let pool:Pool;
test.beforeAll(()=>{
  if(process.env.LAB_TEST_DATABASE!=="1" || !new URL(process.env.DATABASE_URL!).pathname.endsWith("/lab_test"))throw new Error("Integration tests require an explicitly disposable lab_test database. Never run these against real portfolio content.");
  pool=new Pool({connectionString:process.env.DATABASE_URL});
});
test.afterAll(async()=>{await pool?.end();});
async function ownerContext(ownerId=process.env.OWNER_GITHUB_ID!){
  const token=randomBytes(32).toString("hex");
  await pool.query("INSERT INTO sessions(token_hash,owner_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')",[hash(token),ownerId]);
  const context=await requestFactory.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:"lab-session="+token,Origin:origin}});
  const response=await context.get("/api/studio/entries"),data=await response.json();
  return{context,csrf:data.csrf as string,token,response};
}
test("The production preview is locked and excluded from indexing",async({request})=>{
  const r=await request.get("http://127.0.0.1:3200/");expect(await r.text()).toContain("This preview is private");
  expect(r.headers()["x-robots-tag"]).toContain("noindex");
  expect(await (await request.get("http://127.0.0.1:3200/robots.txt")).text()).toContain("Disallow: /");
  expect(await (await request.get("http://127.0.0.1:3200/sitemap.xml")).text()).not.toContain("<loc>");
});
test("Anonymous writes, non-owner sessions, and forged callbacks are rejected",async({request})=>{
  for(const path of ["/api/studio/entries","/api/studio/assets?entry=00000000-0000-4000-8000-000000000001"])expect((await request.get(path)).status()).toBe(401);
  for(const path of ["/api/studio/entries","/api/studio/assets","/api/studio/entries/00000000-0000-4000-8000-000000000001/publish"])expect((await request.post(path,{data:{},headers:{Origin:origin}})).status()).toBe(401);
  expect((await request.put("/api/studio/entries/00000000-0000-4000-8000-000000000001",{data:{}})).status()).toBe(401);
  expect((await request.delete("/api/studio/assets/00000000-0000-4000-8000-000000000001")).status()).toBe(401);
  const foreign=await ownerContext("1");expect(foreign.response.status()).toBe(401);await foreign.context.dispose();
  const callback=await request.get("/api/auth/callback/github?code=forged&state=forged",{maxRedirects:0});
  expect(callback.status()).toBe(303);expect(callback.headers().location).toContain("signin-failed");
});
test("Owner CRUD, durable uploads, snapshots, replacement, unpublish, and direct-file privacy",async({request,page})=>{
  const owner=await ownerContext(),api=owner.context,headers={"X-CSRF-Token":owner.csrf};
  const forged=await api.post("/api/studio/entries",{data:{kind:"project"}});expect(forged.status()).toBe(403);
  const cross=await api.post("/api/studio/entries",{data:{kind:"project"},headers:{...headers,Origin:"https://attacker.invalid"}});expect(cross.status()).toBe(403);
  const created=await api.post("/api/studio/entries",{data:{kind:"project"},headers});expect(created.status()).toBe(201);
  let e=(await created.json()).entry;
  const slug="test-private-"+randomBytes(4).toString("hex");
  async function save(patch:Record<string,unknown>){
    const r=await api.put("/api/studio/entries/"+e.id,{data:{revision:e.revision,slug,data:{...e.draft,...patch}},headers});expect(r.status(),await r.text()).toBe(200);e=(await r.json()).entry;
  }
  async function upload(data:Buffer,role="cover"){
    return api.post("/api/studio/assets?entry="+e.id+"&role="+role+"&revision="+e.revision,{data,headers:{...headers,"Content-Type":"application/octet-stream","X-File-Name":role==="pdf"?"test.pdf":"test.png"}});
  }
  async function publish(value:boolean){
    const r=await api.post("/api/studio/entries/"+e.id+"/publish",{data:{revision:e.revision,publish:value},headers});expect(r.status(),await r.text()).toBe(200);e=(await r.json()).entry;
  }
  await save({title:"[TEST] Private project",body:"A test note.\n\n<script>alert('blocked')</script>\n\n[unsafe](javascript:alert(1))"});
  expect((await request.get("/work/"+slug)).status()).toBe(404);
  const preview=await request.get("/studio/preview/"+e.id,{maxRedirects:0});expect([303,307]).toContain(preview.status());expect(preview.headers().location).toContain("/studio");
  const invalid=await upload(Buffer.from("not an image"));expect(invalid.status()).toBe(415);
  const oversized=await upload(Buffer.alloc(10*1024*1024+1));expect(oversized.status()).toBe(413);
  const png=await sharp({create:{width:640,height:480,channels:3,background:"#2146f5"}}).png().toBuffer();
  const uploaded=await upload(png);expect(uploaded.status(),await uploaded.text()).toBe(201);e=(await uploaded.json()).entry;const first=e.draft.assets[0].id;
  expect((await request.get("/api/files/"+first)).status()).toBe(404);
  expect((await api.get("/api/files/"+first)).status()).toBe(200);
  const reloaded=(await (await api.get("/api/studio/entries")).json()).entries.find((item:{id:string})=>item.id===e.id);expect(reloaded.draft.assets[0].id).toBe(first);
  const noAlt=await api.post("/api/studio/entries/"+e.id+"/publish",{data:{revision:e.revision,publish:true},headers});expect(noAlt.status()).toBe(400);
  await save({assets:e.draft.assets.map((a:Record<string,unknown>)=>({...a,alt:"[TEST] A cobalt rectangle",caption:"Disposable CI fixture"}))});
  await publish(true);
  const publicFile=await request.get("/api/files/"+first);expect(publicFile.status()).toBe(200);expect(publicFile.headers()["cache-control"]).toContain("no-store");expect(publicFile.headers()["content-type"]).toContain("image/webp");
  const asset=(await pool.query("SELECT variants FROM assets WHERE id=$1",[first])).rows[0];
  const anonymousBucket=await request.get(process.env.S3_ENDPOINT+"/"+process.env.S3_BUCKET+"/"+asset.variants["1280"].key);expect(anonymousBucket.status()).toBe(403);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(slug);
  await save({title:"[TEST] SECRET UNPUBLISHED REVISION"});
  const live=await request.get("/work/"+slug);expect(await live.text()).toContain("[TEST] Private project");expect(await live.text()).not.toContain("SECRET UNPUBLISHED REVISION");
  await page.goto("/work/"+slug);expect(await page.locator('a[href^="javascript:"]').count()).toBe(0);
  const replacement=await upload(png);expect(replacement.status()).toBe(201);e=(await replacement.json()).entry;const second=e.draft.assets[0].id;
  expect((await request.get("/api/files/"+first)).status()).toBe(200);expect((await request.get("/api/files/"+second)).status()).toBe(404);
  await save({assets:e.draft.assets.map((a:Record<string,unknown>)=>({...a,alt:"[TEST] Replacement cobalt rectangle"}))});await publish(true);
  expect((await request.get("/api/files/"+first)).status()).toBe(404);expect((await request.get("/api/files/"+second)).status()).toBe(200);
  const conflict=await api.put("/api/studio/entries/"+e.id,{data:{revision:1,slug,data:e.draft},headers});expect(conflict.status()).toBe(409);
  await publish(false);expect((await request.get("/api/files/"+second)).status()).toBe(404);expect((await request.get("/work/"+slug)).status()).toBe(404);expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug);
  const result=await api.delete("/api/studio/entries/"+e.id,{data:{revision:e.revision,confirmation:e.draft.title},headers});expect(result.status()).toBe(200);
  expect((await api.get("/api/files/"+second)).status()).toBe(404);
  await api.dispose();
});
test("PDF paper status is separate from website publication",async({request})=>{
  const owner=await ownerContext(),api=owner.context,headers={"X-CSRF-Token":owner.csrf};
  let e=(await (await api.post("/api/studio/entries",{data:{kind:"paper"},headers})).json()).entry;
  const slug="test-paper-"+randomBytes(4).toString("hex"),pdf=await PDFDocument.create();pdf.addPage([400,500]);
  const uploaded=await api.post("/api/studio/assets?entry="+e.id+"&role=pdf&revision="+e.revision,{data:Buffer.from(await pdf.save()),headers:{...headers,"Content-Type":"application/octet-stream","X-File-Name":"test.pdf"}});
  expect(uploaded.status(),await uploaded.text()).toBe(201);e=(await uploaded.json()).entry;
  const saved=await api.put("/api/studio/entries/"+e.id,{headers,data:{revision:e.revision,slug,data:{...e.draft,title:"[TEST] Paper",authors:["Test fixture"],abstract:"An explicitly synthetic integration-test abstract.",academicStatus:"published"}}});
  expect(saved.status()).toBe(200);e=(await saved.json()).entry;
  const file=e.draft.assets[0].id;expect((await request.get("/api/files/"+file)).status()).toBe(404);
  const published=await api.post("/api/studio/entries/"+e.id+"/publish",{headers,data:{revision:e.revision,publish:true}});expect(published.status()).toBe(200);e=(await published.json()).entry;
  const download=await request.get("/api/files/"+file+"?download=1");expect(download.status()).toBe(200);expect(download.headers()["content-disposition"]).toContain("attachment");expect(download.headers()["content-security-policy"]).toContain("sandbox");expect((await download.body()).subarray(0,5).toString()).toBe("%PDF-");
  const deleted=await api.delete("/api/studio/entries/"+e.id,{headers,data:{revision:e.revision,confirmation:e.draft.title}});expect(deleted.status()).toBe(200);expect((await request.get("/api/files/"+file)).status()).toBe(404);await api.dispose();
});
test("Desktop layout, navigation, keyboard focus, empty collections, and accessibility",async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toContainText("Ideas into");
  await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator("canvas")).toHaveCount(0);
  const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();expect(axe.violations).toEqual([]);
  await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Research",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Research will appear here."})).toBeVisible();
  await expect(page.locator('input[type="search"]')).toHaveCount(0);
  await page.goto("/does-not-exist");await expect(page.getByRole("heading",{name:"Some ideas lead elsewhere."})).toBeVisible();
});
test("Mobile menu, narrow layout, and WebGL fallback",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,kind:string,...args:unknown[]){if(kind.startsWith("webgl")||kind==="experimental-webgl")return null;return (get as Function).apply(this,[kind,...args]);} as typeof get;});
  await page.goto("/");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Menu +"}).click();
  await expect(page.getByRole("navigation",{name:"Main navigation"})).toBeVisible();
  await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Menu +"})).toBeFocused();
  await page.getByRole("button",{name:"Menu +"}).click();await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Work"}).click();await expect(page.getByRole("heading",{name:"Thought, made tangible."})).toBeVisible();
  await page.goto("/");await expect(page.locator(".static-sculpture")).toBeVisible();await expect(page.getByRole("heading",{level:1})).toBeVisible();
  const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();expect(axe.violations).toEqual([]);
});
test("Owner studio UI saves changes through the real API",async({page})=>{
  const user=await ownerContext();await page.context().addCookies([{name:"lab-session",value:user.token,url:origin,httpOnly:true,sameSite:"Lax"}]);
  await page.goto("/studio");await expect(page.getByRole("heading",{name:"What’s taking shape?"})).toBeVisible();
  await page.getByRole("button",{name:"New project +",exact:true}).click();
  await page.getByLabel("Title",{exact:true}).fill("[TEST] UI draft");
  await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByText("Draft saved. Published content is unchanged.")).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"[TEST] UI draft Draft"}).click();await expect(page.getByLabel("Title",{exact:true})).toHaveValue("[TEST] UI draft");
  const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();expect(axe.violations).toEqual([]);
  const entries=(await (await user.context.get("/api/studio/entries")).json()).entries;
  const e=entries.find((x:{draft:{title:string}})=>x.draft.title==="[TEST] UI draft");
  await user.context.delete("/api/studio/entries/"+e.id,{headers:{"X-CSRF-Token":user.csrf},data:{revision:e.revision,confirmation:e.draft.title}});
  await user.context.dispose();
});
test("Capture review artifacts of the empty portfolio",async({page})=>{
  await mkdir("test-results/review",{recursive:true});await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize({width:1440,height:1000});await page.goto("/");await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:"test-results/review/desktop.png",fullPage:true});
  const desktop=await page.screenshot({type:"jpeg",quality:55});console.log("LAB_DESKTOP_IMAGE="+desktop.toString("base64"));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:"test-results/review/mobile.png",fullPage:true});
  const mobile=await page.screenshot({type:"jpeg",quality:60});console.log("LAB_MOBILE_IMAGE="+mobile.toString("base64"));
});
