import type {MetadataRoute} from "next";
import {siteOrigin} from "@/lib/auth";
export default function robots():MetadataRoute.Robots {
  if(process.env.SITE_MODE!=="public")return{rules:{userAgent:"*",disallow:"/"}};
  return{rules:{userAgent:"*",allow:"/",disallow:["/studio","/api/"]},sitemap:siteOrigin()+"/sitemap.xml"};
}
