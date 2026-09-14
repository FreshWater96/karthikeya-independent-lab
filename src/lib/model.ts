import { z } from "zod";

export const kinds = ["project", "paper", "lab", "settings"] as const;
export type Kind = typeof kinds[number];
export const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";
export const academicStatuses = ["work-in-progress", "preprint", "submitted", "published"] as const;
export const safeLink = (value: string, contact = false): boolean => {
  try {
    const url = new URL(value);
    return !url.username && !url.password && (["http:", "https:"].includes(url.protocol) ||
      (contact && url.protocol === "mailto:" && !/[\r\n]/.test(value)));
  } catch { return false; }
};
const link = z.string().max(2000).refine(v => v === "" || safeLink(v), "Use a full https:// or http:// URL.");
const text = (max: number) => z.string().max(max);
export const assetRefSchema = z.object({
  id: z.string().uuid(), role: z.enum(["cover", "gallery", "pdf", "portrait", "cv"]),
  alt: text(500).default(""), caption: text(2000).default("")
}).strict();
export type AssetRef = z.infer<typeof assetRefSchema>;
export const entryDataSchema = z.object({
  title: text(240).default(""), summary: text(1000).default(""),
  year: z.number().int().min(1900).max(2200).nullable().default(null),
  category: text(100).default(""), stage: text(100).default(""),
  tags: z.array(text(80)).max(30).default([]),
  body: text(100000).default(""), contribution: text(30000).default(""),
  approach: text(30000).default(""), outcomes: text(30000).default(""),
  authors: z.array(text(160)).max(50).default([]),
  topics: z.array(text(100)).max(30).default([]),
  abstract: text(20000).default(""),
  academicStatus: z.enum(academicStatuses).default("work-in-progress"),
  venue: text(500).default(""), doi: text(200).default("").refine(v => !v || /^10\.\d{4,9}\/\S+$/.test(v), "Enter a DOI beginning with 10., not a URL."),
  github: link.default(""), demo: link.default(""), video: link.default(""),
  featured: z.boolean().default(false), order: z.number().int().min(0).max(100000).default(0),
  assets: z.array(assetRefSchema).max(40).default([]),
  name: text(200).default(""), displayName: text(80).default(""),
  heroLineOne: text(80).default(""), heroLineTwo: text(80).default(""),
  intro: text(600).default(""), biography: text(30000).default(""),
  links: z.array(z.object({label:text(60),url:text(2000).refine(v=>safeLink(v,true),"Use a web or mailto link.")})).max(12).default([])
}).strict();
export type EntryData = z.infer<typeof entryDataSchema>;
export type Entry = {id:string;kind:Kind;slug:string;draft:EntryData;published:EntryData|null;revision:number;created_at:string;updated_at:string;published_at:string|null};
export type PublicEntry = {id:string;kind:Kind;slug:string;data:EntryData;published_at:string|null};
export const defaults = entryDataSchema.parse({
  name:"Tammineedi Srirama Karthikeya",displayName:"Karthikeya",
  heroLineOne:"Ideas into",heroLineTwo:"new dimensions.",
  intro:"An evolving collection of research, projects, and experiments."
});
export const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");
export const publicationIssues = (kind:Kind, data:EntryData):string[] => {
  const errors:string[]=[];
  if(kind === "settings") {
    if(!data.name.trim() || !data.displayName.trim() || !data.heroLineOne.trim() || !data.heroLineTwo.trim()) errors.push("Complete your name and homepage headline.");
  } else if(!data.title.trim()) errors.push("Add a title.");
  if(kind === "paper" && (!data.authors.length || data.authors.some(a=>!a.trim()) || !data.abstract.trim())) errors.push("Add the paper's authors and abstract.");
  if(data.assets.some(a=>["cover","gallery","portrait"].includes(a.role) && !a.alt.trim())) errors.push("Add alt text for every image.");
  for(const role of ["cover","pdf","portrait","cv"]) if(data.assets.filter(a=>a.role===role).length>1) errors.push("Only one "+role+" file is allowed.");
  const roles = kind==="settings" ? ["portrait","cv"] : kind==="paper" ? ["cover","gallery","pdf"] : ["cover","gallery"];
  if(data.assets.some(a=>!roles.includes(a.role))) errors.push("An attachment has an invalid role for this entry.");
  return errors;
};
export const routeFor = (kind:Kind) => kind==="project" ? "work" : kind==="paper" ? "research" : "lab";
export const isOwnerId = (id:string|number|undefined, configured:string|undefined) => !!configured && /^\d+$/.test(configured) && String(id) === configured;
