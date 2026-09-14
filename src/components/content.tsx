import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import {type AssetRef,type PublicEntry,type EntryData,routeFor,safeLink} from "@/lib/model";
export function Arrow({diagonal=false}:{diagonal?:boolean}){return <span aria-hidden="true">{diagonal?"↗":"↗"}</span>;}
export function Markdown({children}:{children:string}){
  return <div className="prose"><ReactMarkdown skipHtml components={{
    a:({href,children})=>href&&safeLink(href)?<a href={href} target="_blank" rel="noreferrer noopener">{children}</a>:<span>{children}</span>,
    img:({alt})=><span className="inline-image-note">[Image: {alt||"Upload this image through the studio gallery."}]</span>
  }}>{children}</ReactMarkdown></div>;
}
export function AssetImage({asset,priority=false,className=""}:{asset:AssetRef;priority?:boolean;className?:string}){
  const url="/api/files/"+asset.id;
  return <picture className={"asset-picture "+className}>
    <source type="image/webp" srcSet={url+"?w=640 640w, "+url+"?w=1280 1280w, "+url+"?w=1920 1920w"} sizes="(max-width: 700px) 100vw, 80vw"/>
    <Image src={url+"?w=1280"} width={1280} height={960} alt={asset.alt} loading={priority?"eager":"lazy"} unoptimized/>
  </picture>;
}
export function EmptyState({type}:{type:"work"|"research"|"lab"}){
  const title=type==="work"?"New work is taking shape.":type==="research"?"Research will appear here.":"An open space for what’s next.";
  return <div className={"empty-state empty-"+type}>
    <div className="empty-glyph" aria-hidden="true"><span/><span/><span/></div>
    <div><span className="mono eyebrow">THE COLLECTION IS EVOLVING</span><h3>{title}</h3><p>{type==="work"?"A considered collection of projects, from first questions to final form.":type==="research"?"Papers, questions, and ideas — shared when they’re ready.":"Experiments, field notes, and unfinished ideas will find a home here."}</p></div>
    <span className="empty-plus" aria-hidden="true">+</span>
  </div>;
}
export function ProjectItem({entry,index}:{entry:PublicEntry;index:number}){
  const d=entry.data,cover=d.assets.find(a=>a.role==="cover"),url="/"+routeFor(entry.kind)+"/"+entry.slug;
  return <article className="project-item">
    <Link href={url} className="project-image" aria-label={"View "+d.title}>{cover?<AssetImage asset={cover}/>:<div className="project-no-image"><div className="empty-glyph" aria-hidden="true"><span/><span/><span/></div><span className="mono">VISUAL FORTHCOMING</span></div>}</Link>
    <div className="project-meta mono"><span>{String(index+1).padStart(2,"0")} / {d.category||"PROJECT"}</span>{d.year&&<span>{d.year}</span>}</div>
    <Link href={url} className="project-title"><h3>{d.title}</h3><Arrow/></Link>
    {d.summary&&<p>{d.summary}</p>}
  </article>;
}
export function PaperItem({entry}:{entry:PublicEntry}){
  const d=entry.data;
  return <article className="paper-item"><div className="paper-meta mono"><span>{d.academicStatus.replaceAll("-"," ")}</span>{d.year&&<span>{d.year}</span>}</div>
    <div><Link href={"/research/"+entry.slug}><h3>{d.title}<Arrow/></h3></Link><p className="paper-authors">{d.authors.join(" · ")}</p>{d.abstract&&<p>{d.abstract.slice(0,260)}{d.abstract.length>260?"…":""}</p>}{d.topics.length>0&&<div className="tags">{d.topics.map(t=><span key={t}>{t}</span>)}</div>}</div>
  </article>;
}
export function Footer({settings}:{settings:EntryData}){
  return <footer className="site-footer"><div className="footer-top"><p>A continuing<br/><span>work in progress.</span></p><Link href="/about" className="text-link">About the lab <Arrow/></Link></div>
    <div className="footer-bottom"><Link href="/" className="footer-name">{settings.displayName||"Karthikeya"}.</Link><span className="mono">INDEPENDENT LAB / {new Date().getFullYear()}</span><div>{settings.links.map(l=><a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener">{l.label} ↗</a>)}<Link href="/studio">Studio ↗</Link></div></div>
  </footer>;
}
export function EntryView({entry,preview=false}:{entry:PublicEntry;preview?:boolean}){
  const d=entry.data,section=routeFor(entry.kind),cover=d.assets.find(a=>a.role==="cover"),pdf=d.assets.find(a=>a.role==="pdf"),gallery=d.assets.filter(a=>a.role==="gallery");
  return <article className={"detail-page "+(entry.kind==="paper"?"paper-detail":"")}>
    {preview&&<aside className="preview-banner mono">PRIVATE DRAFT PREVIEW — ONLY YOU CAN SEE THIS VERSION</aside>}
    <Link href={"/"+section} className="mono back-link">← BACK TO {section.toUpperCase()}</Link>
    <div className="detail-heading"><span className="mono eyebrow">{d.category||section}{d.year?" / "+d.year:""}</span><h1>{d.title||"Untitled draft"}</h1>{d.summary&&<p className="detail-summary">{d.summary}</p>}</div>
    <div className="detail-facts mono">
      {entry.kind==="paper"?<><span>ACADEMIC STATUS / {d.academicStatus.replaceAll("-"," ")}</span>{d.authors.length>0&&<span>AUTHORS / {d.authors.join(", ")}</span>}{d.venue&&<span>VENUE / {d.venue}</span>}{d.doi&&<a href={"https://doi.org/"+d.doi} target="_blank" rel="noreferrer noopener">DOI / {d.doi} ↗</a>}</>:d.stage&&<span>STAGE / {d.stage}</span>}
      {d.tags.length>0&&<span>{d.tags.join(" / ")}</span>}
    </div>
    {cover&&<figure className="detail-cover"><AssetImage asset={cover} priority/>{cover.caption&&<figcaption>{cover.caption}</figcaption>}</figure>}
    {entry.kind==="paper"&&d.abstract&&<section className="detail-section"><h2>Abstract</h2><Markdown>{d.abstract}</Markdown></section>}
    {[[entry.kind==="paper"?"Notes":"Overview",d.body],["My contribution",d.contribution],["Technical approach",d.approach],["Outcomes",d.outcomes]].filter(([,v])=>v).map(([label,value])=><section className="detail-section" key={label}><h2>{label}</h2><Markdown>{value}</Markdown></section>)}
    {gallery.length>0&&<section className="detail-gallery" aria-label="Project gallery">{gallery.map(a=><figure key={a.id}><AssetImage asset={a}/>{a.caption&&<figcaption>{a.caption}</figcaption>}</figure>)}</section>}
    {pdf&&<section className="paper-document"><div><h2>Read the paper</h2><a href={"/api/files/"+pdf.id+"?download=1"} className="text-link">Download PDF ↓</a></div><iframe title={d.title+" — PDF preview"} src={"/api/files/"+pdf.id} sandbox="allow-same-origin" loading="lazy"/><p className="small">If the preview is unavailable in your browser, use the download link.</p></section>}
    {[d.github,d.demo,d.video].some(Boolean)&&<section className="detail-links">{[["GitHub",d.github],["Live demo",d.demo],["Watch video",d.video]].filter(([,url])=>url).map(([label,url])=><a className="text-link" key={label} href={url} target="_blank" rel="noreferrer noopener">{label} ↗</a>)}</section>}
  </article>;
}
