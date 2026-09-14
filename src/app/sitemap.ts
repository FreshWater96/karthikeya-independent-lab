import type {MetadataRoute} from "next";
import {siteOrigin} from "@/lib/auth";
import {publicEntries} from "@/lib/db";
import {routeFor} from "@/lib/model";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  if(process.env.SITE_MODE!=="public")return[];
  const entries=(await Promise.all([publicEntries("project"),publicEntries("paper"),publicEntries("lab")])).flat();
  return[...["","/work","/research","/lab","/about"].map(path=>({url:siteOrigin()+path})),...entries.map(e=>({url:siteOrigin()+"/"+routeFor(e.kind)+"/"+e.slug,lastModified:e.published_at?new Date(e.published_at):undefined}))];
}
