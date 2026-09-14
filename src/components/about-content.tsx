import type {EntryData} from "@/lib/model";
import {AssetImage,Markdown} from "./content";
export default function AboutContent({settings:s}:{settings:EntryData}){
  const portrait=s.assets.find(a=>a.role==="portrait"),cv=s.assets.find(a=>a.role==="cv");
  return <div className="about-page"><span className="mono eyebrow">04 / THE PERSON BEHIND THE LAB</span><h1>{s.name}</h1><div className="about-layout">
    <div className="about-portrait">{portrait?<AssetImage asset={portrait}/>:<div className="about-monogram" aria-hidden="true">K<span>↗</span></div>}</div>
    <div><span className="mono eyebrow">AN INTRODUCTION</span>{s.biography?<Markdown>{s.biography}</Markdown>:<><h2>A little more,<br/>in time.</h2><p className="muted">A personal introduction will appear here.</p></>}
    {(cv||s.links.length>0)&&<div className="about-links">{cv&&<a className="text-link" href={"/api/files/"+cv.id+"?download=1"}>Download CV ↓</a>}{s.links.map(l=><a className="text-link" key={l.url} href={l.url} target="_blank" rel="noreferrer noopener">{l.label} ↗</a>)}</div>}</div></div></div>;
}
