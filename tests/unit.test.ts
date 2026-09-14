import test from "node:test";
import assert from "node:assert/strict";
import {entryDataSchema,defaults,isOwnerId,publicationIssues,safeLink,slugSchema,SETTINGS_ID} from "../src/lib/model";
test("Owner identity fails closed and uses immutable numeric ID, not first visitor or username",()=>{
  assert.equal(isOwnerId("309612209",undefined),false);
  assert.equal(isOwnerId("FreshWater96","309612209"),false);
  assert.equal(isOwnerId("1","309612209"),false);
  assert.equal(isOwnerId(309612209,"309612209"),true);
});
test("Website defaults contain only supplied identity, no invented work or qualifications",()=>{
  assert.equal(defaults.name,"Tammineedi Srirama Karthikeya");assert.equal(defaults.biography,"");
  assert.deepEqual(defaults.assets,[]);assert.deepEqual(defaults.links,[]);assert.deepEqual(defaults.authors,[]);
});
test("Reject executable URLs, credentials in URLs, and non-slug paths",()=>{
  for(const bad of ["javascript:alert(1)","data:text/html,test","https://a:b@example.com","//example.com"])assert.equal(safeLink(bad),false);
  assert.equal(safeLink("https://example.com/project"),true);assert.equal(safeLink("mailto:owner@example.com",true),true);
  assert.equal(slugSchema.safeParse("../../studio").success,false);
});
test("Entry schema bounds content, validates links, and rejects unexpected privilege fields",()=>{
  assert.equal(entryDataSchema.safeParse({title:"x",admin:true}).success,false);
  assert.equal(entryDataSchema.safeParse({github:"javascript:alert(1)"}).success,false);
  assert.equal(entryDataSchema.safeParse({body:"a".repeat(100001)}).success,false);
  assert.equal(entryDataSchema.safeParse({doi:"https://doi.org/10.1/x"}).success,false);
});
test("Paper academic status does not make a draft publishable",()=>{
  const d=entryDataSchema.parse({title:"[TEST] Paper",academicStatus:"published"});
  assert.ok(publicationIssues("paper",d).some(s=>s.includes("authors")));
  assert.equal("published" in d,false);
});
test("Images require descriptions and incompatible attachment roles are rejected",()=>{
  const d=entryDataSchema.parse({title:"[TEST] Entry",assets:[{id:SETTINGS_ID,role:"cover",alt:""}]});
  assert.ok(publicationIssues("project",d).some(s=>s.includes("alt")));
  d.assets[0].alt="A blue square";assert.deepEqual(publicationIssues("project",d),[]);
  d.assets[0].role="cv";assert.ok(publicationIssues("project",d).some(s=>s.includes("role")));
});
test("Unconfigured identity cannot be published as site settings",()=>{
  assert.ok(publicationIssues("settings",entryDataSchema.parse({})).length);
  assert.deepEqual(publicationIssues("settings",defaults),[]);
});
