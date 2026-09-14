import Link from "next/link";
import type {Metadata} from "next";
import {settings,publicEntries} from "@/lib/db";
import {publicAccess} from "@/lib/auth";
import Sculpture from "@/components/sculpture";
import {EmptyState,ProjectItem,PaperItem,Arrow} from "@/components/content";
export async function generateMetadata():Promise<Metadata>{
  if(!(await publicAccess()))return{title:"Private preview",robots:{index:false,follow:false}};
  const s=await settings();return{title:s.displayName+" — Independent Lab",description:s.intro,alternates:{canonical:"/"}};
}
export default async function Home(){
  if(!(await publicAccess()))return null;
  const [s,work,research,lab]=await Promise.all([settings(),publicEntries("project"),publicEntries("paper"),publicEntries("lab")]);
  return <>
    <section className="hero">
      <div className="hero-top mono"><span>AN INDEPENDENT SPACE FOR EXPLORATION</span><span>RESEARCH / PROJECTS / EXPERIMENTS</span></div>
      <Sculpture/>
      <h1><span>{s.heroLineOne}</span><span>{s.heroLineTwo}</span></h1>
      <div className="hero-bottom"><p>{s.intro}</p><a href="#work" className="scroll-link mono">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a></div>
      <div className="hero-baseline mono"><span>THOUGHT → FORM</span><span>ALWAYS IN THE MAKING</span></div>
    </section>
    <section className="intro-section"><span className="mono eyebrow">00 / THE INDEPENDENT LAB</span><h2>A place for questions.<br/><span>And what comes after.</span></h2><p>Research, projects, and experiments — a space to follow an idea, give it form, and share what emerges.</p></section>
    <section id="work" className="editorial-section"><div className="section-heading"><div><span className="mono eyebrow">01 / SELECTED WORK</span><h2>From thought<br/>to something real.</h2></div><Link href="/work" className="text-link">Explore the work <Arrow/></Link></div>
      {work.length?<div className="project-grid">{work.slice(0,4).map((entry,index)=><ProjectItem key={entry.id} entry={entry} index={index}/>)}</div>:<EmptyState type="work"/>}
    </section>
    <section className="editorial-section research-section"><div className="section-heading"><div><span className="mono eyebrow">02 / RESEARCH</span><h2>Ideas worth<br/>looking into.</h2></div><div className="section-aside"><p>A quieter space for papers, questions, and the thinking behind the work.</p><Link href="/research" className="text-link">Research archive <Arrow/></Link></div></div>
      {research.length?<div>{research.slice(0,3).map(entry=><PaperItem key={entry.id} entry={entry}/>)}</div>:<EmptyState type="research"/>}
    </section>
    <section className="lab-section"><div className="lab-orbit" aria-hidden="true"><span/><span/><span/></div><span className="mono eyebrow">03 / THE LAB</span><h2>Not everything<br/>needs to be<br/><em>finished.</em></h2><div className="lab-bottom"><p>A home for open questions, small experiments, and things that might become something else.</p><Link href="/lab" className="text-link">{lab.length?"Explore the experiments":"Step inside the lab"} <Arrow/></Link></div></section>
    <section className="about-teaser"><span className="mono eyebrow">04 / ABOUT</span><div><h2>{s.name}</h2><Link href="/about" className="text-link">The person behind the lab <Arrow/></Link></div></section>
  </>;
}
