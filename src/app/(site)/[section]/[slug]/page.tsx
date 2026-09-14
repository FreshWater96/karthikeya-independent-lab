import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {publicEntry} from "@/lib/db";
import {publicAccess} from "@/lib/auth";
import {EntryView} from "@/components/content";
import type {Kind} from "@/lib/model";
const map:Record<string,Kind>={work:"project",research:"paper",lab:"lab"};
type Context={params:Promise<{section:string;slug:string}>};
export async function generateMetadata({params}:Context):Promise<Metadata>{
  if(!(await publicAccess()))return{title:"Private preview",robots:{index:false,follow:false}};
  const {section,slug}=await params;
  if(!Object.hasOwn(map,section))return{title:"Not found"};
  const e=await publicEntry(map[section],slug);
  if(!e)return{title:"Not found"};
  const description=e.data.summary||e.data.abstract.slice(0,180);
  return{title:e.data.title,description,alternates:{canonical:"/"+section+"/"+slug},openGraph:{title:e.data.title,description,type:"article",images:["/opengraph-image"]}};
}
export default async function Detail({params}:Context){
  if(!(await publicAccess()))return null;
  const {section,slug}=await params;if(!Object.hasOwn(map,section))notFound();
  const entry=await publicEntry(map[section],slug);if(!entry)notFound();
  return <EntryView entry={entry}/>;
}
