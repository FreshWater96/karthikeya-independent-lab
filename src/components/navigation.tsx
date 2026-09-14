"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
export const navigation=[["Work","/work"],["Research","/research"],["Lab","/lab"],["About","/about"]];
export function Mark(){return <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M6 5v22M26 5 8 16l18 11M7 16h18" fill="none" stroke="currentColor" strokeWidth="2.2"/></svg>;}
export default function Navigation({name}:{name:string}){
  const path=usePathname(),[open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null);
  useEffect(()=>{setOpen(false);},[path]);
  return <header className="site-header">
    <Link href="/" className="wordmark" aria-label={name+" — Home"}><Mark/><span>{name}<span className="wordmark-dot">.</span></span><span className="brand-label mono">INDEPENDENT<br/>LAB</span></Link>
    <button type="button" className="menu-toggle mono" ref={toggle} aria-expanded={open} aria-controls="main-navigation" onClick={()=>setOpen(!open)}>{open?"Close −":"Menu +"}</button>
    <nav id="main-navigation" className={open?"main-navigation is-open":"main-navigation"} aria-label="Main navigation" onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);toggle.current?.focus();}}}>
      {navigation.map(([label,url])=><Link key={url} href={url} aria-current={path.startsWith(url)?"page":undefined}>{label}<span aria-hidden="true">↗</span></Link>)}
      <Link href="/studio" className="studio-link mono">Studio <span aria-hidden="true">↗</span></Link>
    </nav>
  </header>;
}
