import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {publicEntries} from "@/lib/db";
import {publicAccess} from "@/lib/auth";
import Collection from "@/components/collection";
const pages={
  work:{kind:"project" as const,index:"01",title:"Thought, made tangible.",subtitle:"Projects, systems, and the stories behind them."},
  research:{kind:"paper" as const,index:"02",title:"Questions come first.",subtitle:"Papers and ideas in progress. Each work carries its own academic status."},
  lab:{kind:"lab" as const,index:"03",title:"Room to experiment.",subtitle:"Notes, prototypes, and ideas that are still finding their form."}
};
type Context={params:Promise<{section:string}>};
export async function generateMetadata({params}:Context):Promise<Metadata>{
  if(!(await publicAccess()))return{title:"Private preview",robots:{index:false,follow:false}};
  const {section}=await params;if(!(section in pages))return{title:"Not found"};
  const p=pages[section as keyof typeof pages];return{title:section[0].toUpperCase()+section.slice(1),description:p.subtitle,alternates:{canonical:"/"+section}};
}
export default async function CollectionPage({params}:Context){
  if(!(await publicAccess()))return null;
  const {section}=await params;if(!(section in pages))notFound();
  const p=pages[section as keyof typeof pages],entries=await publicEntries(p.kind);
  return <div className="collection-page"><header className="collection-heading"><span className="mono eyebrow">{p.index} / {section.toUpperCase()}</span><h1>{p.title}</h1><p>{p.subtitle}</p></header><Collection entries={entries} section={section as keyof typeof pages}/></div>;
}
