"use client";
import {useEffect,useId,useRef,useState} from "react";

export function StaticSculpture(){
  const id=useId().replace(/:/g,"");
  return <svg viewBox="0 0 650 650" role="img" aria-label="An abstract cobalt ribbon folded through orbital contours" className="static-sculpture">
    <defs>
      <linearGradient id={id+"blue"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#081149"/><stop offset=".28" stopColor="#1649f5"/><stop offset=".55" stopColor="#7194ff"/><stop offset=".72" stopColor="#1649f5"/><stop offset="1" stopColor="#071c78"/></linearGradient>
      <linearGradient id={id+"dark"}><stop stopColor="#171920"/><stop offset=".48" stopColor="#a5a9b2"/><stop offset=".58" stopColor="#222630"/><stop offset="1" stopColor="#070b15"/></linearGradient>
      <filter id={id+"shadow"}><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <ellipse cx="337" cy="560" rx="128" ry="15" fill="#242832" opacity=".13" filter={"url(#"+id+"shadow)"}/>
    <g fill="none" stroke="#a8b0c0" strokeWidth=".7" opacity=".65">
      <ellipse cx="328" cy="321" rx="282" ry="178" transform="rotate(-39 328 321)"/>
      <ellipse cx="328" cy="321" rx="272" ry="120" transform="rotate(43 328 321)"/>
      <path d="M75 188 554 467M121 490 520 142M327 60V584"/>
    </g>
    <g fill="none" strokeLinecap="round">
      <path d="M440 178C630 262 394 548 238 452S182 119 333 150 444 503 282 472 91 220 229 197 569 351 440 178Z" stroke="#081139" strokeWidth="58"/>
      <path d="M440 169C630 253 394 539 238 443S182 110 333 141 444 494 282 463 91 211 229 188 569 342 440 169Z" stroke={"url(#"+id+"blue)"} strokeWidth="45"/>
      <path d="M192 286C132 366 344 486 452 362S334 185 257 237 331 447 409 369" stroke={"url(#"+id+"dark)"} strokeWidth="24"/>
      <path d="M440 151C525 191 526 272 476 349M196 221C180 153 259 114 326 127" stroke="#a8baff" opacity=".65" strokeWidth="2"/>
    </g>
    <g fill="#1e46ee"><circle cx="101" cy="193" r="3"/><circle cx="546" cy="460" r="3"/><circle cx="492" cy="143" r="3"/></g>
  </svg>;
}
export default function Sculpture(){
  const host=useRef<HTMLDivElement>(null);
  const [motion,setMotion]=useState(false),[available,setAvailable]=useState(true),[reason,setReason]=useState("Static study"),[active,setActive]=useState(false);
  useEffect(()=>{
    const media=matchMedia("(prefers-reduced-motion: reduce)");
    const nav=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
    const low=(nav.deviceMemory!==undefined&&nav.deviceMemory<4)||(nav.hardwareConcurrency!==undefined&&nav.hardwareConcurrency<4)||nav.connection?.saveData;
    if(low){setAvailable(false);setReason("Low-power static study");return;}
    let preference:string|null=null;try{preference=localStorage.getItem("lab-motion");}catch{}
    setMotion(!media.matches&&preference!=="off");
    const change=()=>{if(media.matches){setMotion(false);setReason("Reduced-motion study");}};
    media.addEventListener("change",change);
    if(media.matches)setReason("Reduced-motion study");
    return()=>media.removeEventListener("change",change);
  },[]);
  useEffect(()=>{
    if(!host.current||!motion||!available){setActive(false);return;}
    const element=host.current;let disposed=false,cleanup:(()=>void)|undefined,started=false;
    const observer=new IntersectionObserver(async entries=>{
      if(!entries[0].isIntersecting||started)return;started=true;
      try{
        const {mountSculpture}=await import("./sculpture-scene");
        if(disposed)return;
        cleanup=mountSculpture(element,()=>{setAvailable(false);setActive(false);setReason("Static study · 3D unavailable");});
        setActive(true);
      }catch{if(!disposed){setAvailable(false);setActive(false);setReason("Static study · 3D unavailable");}}
    },{rootMargin:"150px"});
    observer.observe(element);
    return()=>{disposed=true;observer.disconnect();cleanup?.();};
  },[motion,available]);
  function toggle(){const next=!motion;setMotion(next);try{localStorage.setItem("lab-motion",next?"on":"off");}catch{}}
  return <div className="sculpture-stage">
    <div className={"sculpture-fallback "+(active?"is-hidden":"")}><StaticSculpture/></div>
    <div ref={host} className="sculpture-canvas" aria-hidden="true"/>
    <span className="sculpture-coordinate mono">FORM STUDY — 001<br/>NOT SCIENTIFIC DATA</span>
    <div className="motion-control">{available?<button type="button" onClick={toggle} aria-pressed={motion} aria-label={motion?"Pause sculpture animation":"Enable sculpture animation"}><span className={motion?"motion-light on":"motion-light"}/>{motion?"Motion on":"Motion off"}<span aria-hidden="true">{motion?"Ⅱ":"▷"}</span></button>:<span className="mono">{reason}</span>}</div>
  </div>;
}
