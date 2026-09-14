"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {type PublicEntry} from "@/lib/model";
import {EmptyState,ProjectItem,PaperItem} from "./content";
export default function Collection({entries,section}:{entries:PublicEntry[];section:"work"|"research"|"lab"}){
  const [query,setQuery]=useState(""),[category,setCategory]=useState("");
  const options=useMemo(()=>Array.from(new Set(entries.flatMap(e=>section==="research"?e.data.topics:e.data.category?[e.data.category]:[]))).sort(),[entries,section]);
  const filtered=entries.filter(e=>{
    const d=e.data;return (d.title+" "+d.summary+" "+d.abstract+" "+d.tags.join(" ")).toLowerCase().includes(query.toLowerCase()) &&
      (!category||(section==="research"?d.topics.includes(category):d.category===category));
  });
  if(!entries.length)return <EmptyState type={section}/>;
  return <>
    <div className="collection-tools"><label className="search-field"><span className="mono">SEARCH {section.toUpperCase()}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Follow a thread…" type="search"/></label>
      {options.length>1&&<label className="filter-field"><span className="mono">{section==="research"?"TOPIC":"CATEGORY"}</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>}
    </div>
    {!filtered.length?<div className="search-empty"><h2>No matches, just yet.</h2><button type="button" className="text-link" onClick={()=>{setQuery("");setCategory("");}}>Clear filters ↗</button></div>:
      section==="work"?<div className="project-grid">{filtered.map((e,i)=><ProjectItem key={e.id} entry={e} index={i}/>)}</div>:
      section==="research"?filtered.map(e=><PaperItem key={e.id} entry={e}/>):
      <div className="lab-list">{filtered.map((e,i)=><article key={e.id}><span className="mono">{String(i+1).padStart(2,"0")}</span><div><span className="mono eyebrow">{e.data.category||"EXPERIMENT"}{e.data.year?" / "+e.data.year:""}</span><Link href={"/lab/"+e.slug}><h2>{e.data.title} ↗</h2></Link>{e.data.summary&&<p>{e.data.summary}</p>}</div>{e.data.stage&&<span className="mono lab-stage">{e.data.stage}</span>}</article>)}</div>}
  </>;
}
