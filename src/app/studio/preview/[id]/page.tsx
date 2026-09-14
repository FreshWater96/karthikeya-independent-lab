import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {owner} from "@/lib/auth";
import {draftEntry} from "@/lib/db";
import {EntryView} from "@/components/content";
import AboutContent from "@/components/about-content";
import type {Metadata} from "next";
import {z} from "zod";
export const metadata:Metadata={title:"Private draft preview",robots:{index:false,follow:false}};
export default async function Preview({params}:{params:Promise<{id:string}>}){
  if(!(await owner()))redirect("/studio");
  const parsed=z.string().uuid().safeParse((await params).id);if(!parsed.success)notFound();
  const entry=await draftEntry(parsed.data);if(!entry)notFound();
  return <main id="main"><div className="preview-toolbar"><Link href="/studio">← Back to studio</Link><span className="mono">UNPUBLISHED CHANGES / OWNER ONLY</span></div>
    {entry.kind==="settings"?<><div className="settings-hero-preview"><span className="mono">{entry.draft.displayName} / INDEPENDENT LAB</span><h1>{entry.draft.heroLineOne}<br/>{entry.draft.heroLineTwo}</h1><p>{entry.draft.intro}</p></div><AboutContent settings={entry.draft}/></>:<EntryView entry={{id:entry.id,kind:entry.kind,slug:entry.slug,data:entry.draft,published_at:null}} preview/>}</main>;
}
