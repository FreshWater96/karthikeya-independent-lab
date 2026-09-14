"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback,useEffect,useRef,useState} from "react";
import {type Entry,type EntryData,type AssetRef,SETTINGS_ID,academicStatuses,routeFor} from "@/lib/model";
import {AssetImage} from "./content";

type StoredFile={id:string;mime:string;filename:string;bytes:number};
type Confirm={title:string;message:string;match?:string;run:()=>Promise<void>};
const labels={project:"Projects",paper:"Research",lab:"Lab",settings:"Site settings"};
export default function Studio(){
  const router=useRouter();
  const [entries,setEntries]=useState<Entry[]>([]),[selected,setSelected]=useState<string|null>(null);
  const [entry,setEntry]=useState<Entry|null>(null),[csrf,setCsrf]=useState(""),[storage,setStorage]=useState(false);
  const [loaded,setLoaded]=useState(false),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(""),[error,setError]=useState(""),[progress,setProgress]=useState<number|null>(null);
  const [tab,setTab]=useState<"content"|"files"|"metadata">("content"),[stored,setStored]=useState<StoredFile[]>([]);
  const [confirm,setConfirm]=useState<Confirm|null>(null),[confirmation,setConfirmation]=useState("");
  const dialog=useRef<HTMLDialogElement>(null),fileInput=useRef<HTMLInputElement>(null);
  const [role,setRole]=useState<AssetRef["role"]>("cover");
  const xhrRef=useRef<XMLHttpRequest|null>(null);

  const apply=useCallback((value:Entry)=>{
    setEntry(value);setSelected(value.id);setDirty(false);
    setEntries(old=>[...old.filter(e=>e.id!==value.id),value]);
  },[]);
  const refresh=useCallback(async()=>{
    setError("");
    const r=await fetch("/api/studio/entries",{cache:"no-store"}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"Unable to load the studio.");
    setEntries(data.entries);setCsrf(data.csrf);setStorage(data.storageReady);setLoaded(true);
    return data.entries as Entry[];
  },[]);
  useEffect(()=>{refresh().catch(e=>setError(e.message));return()=>xhrRef.current?.abort();},[refresh]);
  useEffect(()=>{
    const before=(e:BeforeUnloadEvent)=>{if(dirty||busy){e.preventDefault();e.returnValue="";}};
    window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);
  },[dirty,busy]);
  useEffect(()=>{if(confirm){setConfirmation("");dialog.current?.showModal();}else dialog.current?.close();},[confirm]);
  useEffect(()=>{
    if(!selected||tab!=="files")return;
    fetch("/api/studio/assets?entry="+selected,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setStored(d.assets);}).catch(e=>setError(e.message));
  },[selected,tab,entry?.revision]);

  async function api(url:string,method:string,body?:unknown){
    const r=await fetch(url,{method,headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:body===undefined?undefined:JSON.stringify(body)});
    const result=await r.json();if(!r.ok)throw new Error(result.error||"The operation could not finish.");return result;
  }
  async function act(fn:()=>Promise<void>){setBusy(true);setError("");setMessage("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}finally{setBusy(false);}}
  async function save(){
    if(!entry)throw new Error("Choose an entry first.");
    const result=await api("/api/studio/entries/"+entry.id,"PUT",{revision:entry.revision,slug:entry.slug,data:entry.draft});
    apply(result.entry);setMessage("Draft saved. Published content is unchanged.");return result.entry as Entry;
  }
  function select(next:Entry){
    const choose=async()=>{apply(next);setTab("content");setMessage("");setError("");setRole(next.kind==="settings"?"portrait":"cover");};
    if(dirty)setConfirm({title:"Discard unsaved changes?",message:"Your saved draft will remain intact.",run:choose});else void choose();
  }
  async function create(kind:"project"|"paper"|"lab"){
    const execute=()=>act(async()=>{const data=await api("/api/studio/entries","POST",{kind});apply(data.entry);setTab("content");setRole("cover");setMessage("Private draft created.");});
    if(dirty)setConfirm({title:"Leave unsaved changes?",message:"Save this draft first if you want to keep your changes.",run:execute});else await execute();
  }
  function set<K extends keyof EntryData>(key:K,value:EntryData[K]){
    if(!entry)return;setEntry({...entry,draft:{...entry.draft,[key]:value}});setDirty(true);setMessage("");
  }
  function field(key:keyof EntryData,label:string,options:{long?:boolean;hint?:string;type?:string}={}){
    if(!entry)return null;
    const value=entry.draft[key];const id="field-"+key;
    return <label className={"studio-field "+(options.long?"full":"")} htmlFor={id}><span>{label}</span>
      {options.long?<textarea id={id} value={String(value??"")} onChange={e=>set(key,e.target.value as never)} rows={key==="body"||key==="biography"?10:5} disabled={busy}/>:
      <input id={id} type={options.type||"text"} value={String(value??"")} disabled={busy} onChange={e=>set(key,(options.type==="number"?(e.target.value===""?null:Number(e.target.value)):e.target.value) as never)}/>}
      {options.hint&&<small>{options.hint}</small>}</label>;
  }
  function listField(key:"tags"|"authors"|"topics",label:string){
    return <label className="studio-field"><span>{label}</span><input disabled={busy} value={entry!.draft[key].join(", ")} onChange={e=>set(key,e.target.value.split(",").map(s=>s.trim()))} onBlur={()=>set(key,entry!.draft[key].map(s=>s.trim()).filter(Boolean))}/><small>Separate each item with a comma.</small></label>;
  }
  function changeAsset(index:number,key:"alt"|"caption",value:string){
    set("assets",entry!.draft.assets.map((a,i)=>i===index?{...a,[key]:value}:a));
  }
  async function upload(file:File){
    if(!entry)return;
    const pdf=["pdf","cv"].includes(role),max=(pdf?15:10)*1024*1024;
    if(file.size>max){setError(pdf?"PDFs must be 15 MB or smaller.":"Images must be 10 MB or smaller.");return;}
    if(!file.size){setError("The selected file is empty.");return;}
    await act(async()=>{
      const current=dirty?await save():entry;
      setProgress(0);
      try{
        const result=await new Promise<{entry:Entry}>((resolve,reject)=>{
          const xhr=new XMLHttpRequest();xhrRef.current=xhr;
          xhr.open("POST","/api/studio/assets?"+new URLSearchParams({entry:current.id,role,revision:String(current.revision)}));
          xhr.setRequestHeader("X-CSRF-Token",csrf);xhr.setRequestHeader("X-File-Name",encodeURIComponent(file.name));xhr.setRequestHeader("Content-Type","application/octet-stream");
          xhr.timeout=120000;xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.min(99,Math.round(e.loaded/e.total*100)));};
          xhr.onload=()=>{try{const data=JSON.parse(xhr.responseText);if(xhr.status<200||xhr.status>=300)reject(new Error(data.error||"Upload failed."));else resolve(data);}catch{reject(new Error("The server returned an unreadable response."));}};
          xhr.onerror=()=>reject(new Error("The upload lost its connection. Your saved draft is safe."));
          xhr.ontimeout=()=>reject(new Error("The upload timed out. Check the studio before retrying."));
          xhr.onabort=()=>reject(new Error("Upload cancelled."));
          xhr.send(file);
        });
        apply(result.entry);setMessage("File stored. Add alt text and a caption, then publish when ready.");
      }finally{setProgress(null);xhrRef.current=null;if(fileInput.current)fileInput.current.value="";}
    });
  }
  async function publish(publish:boolean){
    if(!entry)return;
    await act(async()=>{
      const current=dirty?await save():entry;
      const result=await api("/api/studio/entries/"+current.id+"/publish","POST",{revision:current.revision,publish});
      apply(result.entry);setMessage(publish?"Published snapshot updated. Site access is still controlled by preview mode.":"Unpublished. This entry and its files are now owner-only.");
    });
  }
  function remove(){
    if(!entry)return;const current=entry;
    setConfirm({title:"Delete this entry?",message:"The entry will be removed from the website and studio. Stored files are queued for permanent cleanup. Export anything you want to keep first.",match:current.draft.title||current.slug,run:()=>act(async()=>{
      await api("/api/studio/entries/"+current.id,"DELETE",{revision:current.revision,confirmation:current.draft.title||current.slug});setEntry(null);setSelected(null);setDirty(false);await refresh();setMessage("Entry deleted. Referenced file access has been revoked.");
    })});
  }
  const d=entry?.draft,settings=entry?.kind==="settings";
  return <main id="main" className="studio-shell">
    <header className="studio-header"><Link href="/" className="studio-brand">Karthikeya<span>.</span> <small className="mono">CONTENT STUDIO</small></Link><div><Link href="/" target="_blank" className="small">View site ↗</Link><button className="quiet-button" disabled={busy} onClick={()=>act(async()=>{if(dirty&&!window.confirm("Discard unsaved changes and sign out?"))return;await api("/api/auth/logout","POST");window.location.assign("/studio");})}>Sign out</button></div></header>
    <aside className="studio-sidebar"><span className="mono eyebrow">YOUR COLLECTION</span>
      {(["project","paper","lab"] as const).map(kind=><section key={kind}><div className="studio-group-title"><h2>{labels[kind]}</h2><button type="button" disabled={busy||!loaded} aria-label={"Create "+kind} onClick={()=>create(kind)}>+</button></div>
        {entries.filter(e=>e.kind===kind).length?entries.filter(e=>e.kind===kind).map(e=><button disabled={busy} type="button" key={e.id} className={selected===e.id?"entry-select active":"entry-select"} onClick={()=>select(e)}><span>{e.draft.title||"Untitled draft"}</span><small>{e.published?"Published":"Draft"}</small></button>):<p className="sidebar-empty">No entries yet.</p>}
      </section>)}
      {entries.find(e=>e.id===SETTINGS_ID)&&<button disabled={busy} className={"settings-select "+(settings?"active":"")} onClick={()=>select(entries.find(e=>e.id===SETTINGS_ID)!)}>Identity & site settings ↗</button>}
      <p className="sidebar-note">Drafts are private.<br/>Academic status and website visibility are independent.</p>
    </aside>
    <section className="studio-editor">
      <div className="studio-notices" aria-live="polite">{message&&<p className="success-text" role="status">{message}</p>}{error&&<p className="error-text" role="alert">{error}</p>}</div>
      {!loaded?<div className="studio-welcome"><h1>{error?"Unable to open the studio.":"Opening your studio…"}</h1>{error&&<button className="button" onClick={()=>refresh().catch(e=>setError(e.message))}>Try again ↗</button>}</div>:
      !entry?<div className="studio-welcome"><span className="mono eyebrow">A QUIET PLACE TO CREATE</span><h1>What’s<br/>taking shape?</h1><p>Start with a project, a paper, or a small experiment. Nothing appears on the site until you publish it.</p><div className="welcome-actions"><button className="button" disabled={busy} onClick={()=>create("project")}>New project +</button><button className="text-link" disabled={busy} onClick={()=>create("paper")}>New paper ↗</button></div></div>:
      <>
        <header className="editor-heading"><div><span className="mono eyebrow">{labels[entry.kind]} / {entry.published?"PUBLISHED SNAPSHOT":"PRIVATE DRAFT"}</span><h1>{settings?"Your independent lab.":d!.title||"Untitled draft"}</h1></div><span className={"save-indicator mono "+(dirty?"unsaved":"")}>{busy?"WORKING…":dirty?"UNSAVED CHANGES":"SAVED"}</span></header>
        <div className="editor-actions"><button className="button" disabled={busy||!dirty} onClick={()=>act(async()=>{await save();})}>Save draft</button>
          <button className="quiet-button" disabled={busy} onClick={()=>act(async()=>{if(dirty)await save();router.push("/studio/preview/"+entry.id);})}>Private preview ↗</button>
          <button className="quiet-button publish-button" disabled={busy} onClick={()=>setConfirm({title:entry.published?"Update the published version?":"Publish this entry?",message:"This publishes the saved content and selected attachments. It does not change the site's preview-access setting. Check image descriptions and any sensitive documents first.",run:()=>publish(true)})}>{entry.published?"Update published":"Publish"}</button>
          {entry.published&&<button className="quiet-button" disabled={busy} onClick={()=>setConfirm({title:"Unpublish this entry?",message:"The entry and its files will stop being available to visitors.",run:()=>publish(false)})}>Unpublish</button>}
        </div>
        <div className="editor-tabs" role="tablist" aria-label="Editor sections">{(["content","files","metadata"] as const).map(t=><button id={"tab-"+t} role="tab" tabIndex={tab===t?0:-1} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const tabs=["content","files","metadata"] as const;const next=tabs[(tabs.indexOf(t)+(e.key==="ArrowRight"?1:2))%3];setTab(next);document.getElementById("tab-"+next)?.focus();}}} aria-selected={tab===t} aria-controls={"panel-"+t} key={t} onClick={()=>setTab(t)} className={tab===t?"active":""}>{t==="content"?"Content":t==="files"?"Files & images":settings?"Links & identity":"Details & links"}</button>)}</div>
        <section id={"panel-"+tab} role="tabpanel" aria-labelledby={"tab-"+tab}>
        {tab==="content"&&<div className="editor-fields">
          {settings?<>{field("name","Full name")}{field("displayName","Display name")}{field("heroLineOne","Homepage headline · line one")}{field("heroLineTwo","Homepage headline · line two")}{field("intro","Homepage supporting text",{long:true})}{field("biography","Biography",{long:true,hint:"Markdown supported. Raw HTML and embedded external images are not rendered."})}</>:
          <>{field("title","Title")}{field("summary","Short summary",{long:true})}{entry.kind==="paper"?<>{listField("authors","Authors")}{field("abstract","Abstract",{long:true})}</>:null}
          {field("body",entry.kind==="paper"?"Paper notes":"Case study / entry",{long:true,hint:"Markdown supports headings, lists, links, and code. Raw HTML is disabled. Upload images in Files & images."})}
          {entry.kind==="project"&&<>{field("contribution","My contribution",{long:true})}{field("approach","Technical approach",{long:true})}{field("outcomes","Outcomes",{long:true,hint:"Only include outcomes you can substantiate."})}</>}</>}
        </div>}
        {tab==="metadata"&&<div className="editor-fields">
          {settings?<div className="studio-field full"><h2>Contact & social links</h2><p className="small">Only the links you add will appear publicly.</p>
            {d!.links.map((l,i)=><div className="link-editor" key={i}><label>Label<input disabled={busy} value={l.label} onChange={e=>set("links",d!.links.map((v,j)=>i===j?{...v,label:e.target.value}:v))}/></label><label>URL<input disabled={busy} type="url" value={l.url} onChange={e=>set("links",d!.links.map((v,j)=>i===j?{...v,url:e.target.value}:v))}/></label><button className="quiet-button" disabled={busy} aria-label={"Remove "+l.label+" link"} onClick={()=>set("links",d!.links.filter((_,j)=>j!==i))}>Remove</button></div>)}
            <button className="text-link" disabled={busy||d!.links.length>=12} onClick={()=>set("links",[...d!.links,{label:"",url:""}])}>Add link +</button></div>:
          <><label className="studio-field"><span>URL slug</span><input value={entry.slug} disabled={busy||!!entry.published} onChange={e=>{setEntry({...entry,slug:e.target.value});setDirty(true);}}/><small>{"/"+routeFor(entry.kind)+"/"+entry.slug}{entry.published?" · Unpublish to change.":""}</small></label>
            {field("year","Year",{type:"number"})}{field("category","Category")}{field("stage","Project stage / progress label")}{listField("tags","Tags")}
            {entry.kind==="paper"&&<><label className="studio-field"><span>Academic status</span><select value={d!.academicStatus} disabled={busy} onChange={e=>set("academicStatus",e.target.value as EntryData["academicStatus"])}>{academicStatuses.map(s=><option key={s} value={s}>{s.replaceAll("-"," ")}</option>)}</select><small>This does not publish the paper on your website.</small></label>{listField("topics","Research topics")}{field("venue","Publication venue (optional)")}{field("doi","DOI (optional)",{hint:"For example, a DOI beginning with 10.; no URL prefix."})}</>}
            {field("github","GitHub URL (optional)",{type:"url"})}{field("demo","Live demo URL (optional)",{type:"url"})}{field("video","Video URL (optional)",{type:"url"})}
            <label className="studio-checkbox"><input type="checkbox" checked={d!.featured} disabled={busy} onChange={e=>set("featured",e.target.checked)}/> Feature this entry</label>
            {field("order","Display order",{type:"number",hint:"Lower numbers appear first. Publish to apply ordering and featured changes."})}
          </>}
        </div>}
        {tab==="files"&&<div className="files-editor">
          {!storage?<p className="setup-notice">Uploads are locked until private S3-compatible storage is configured on the server.</p>:<div className="upload-box"><div><h2>Add or replace a file</h2><p>Images: JPG, PNG, WebP · up to 10 MB / 24 MP<br/>PDFs: up to 15 MB, unencrypted</p><p className="small">Uploading saves current changes. Replacements affect only the draft until you publish.</p></div>
            <label className="studio-field"><span>File role</span><select value={role} disabled={busy} onChange={e=>setRole(e.target.value as AssetRef["role"])}>{(settings?["portrait","cv"]:entry.kind==="paper"?["cover","gallery","pdf"]:["cover","gallery"]).map(r=><option value={r} key={r}>{r==="cover"?"Cover image":r==="gallery"?"Gallery image":r==="pdf"?"Paper PDF":r==="cv"?"CV (PDF)":"Portrait"}</option>)}</select></label>
            <label className="file-pick"><span>{busy?"Please wait…":"Choose a file ↑"}</span><input ref={fileInput} aria-label="Upload file" type="file" disabled={busy} accept={["pdf","cv"].includes(role)?".pdf,application/pdf":".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"} onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);}}/></label>
            {progress!==null&&<div className="upload-progress" aria-live="polite"><progress max="100" value={progress} aria-label="Upload progress"/><span>{progress>=99?"Validating and storing…":progress+"% uploaded"}</span></div>}
          </div>}
          <div className="attached-files">{d!.assets.length===0?<p className="muted">No files attached to this draft.</p>:d!.assets.map((a,i)=><article className="attached-file" key={a.id}>
            {["cover","gallery","portrait"].includes(a.role)?<AssetImage asset={a}/>:<a className="pdf-tile" href={"/api/files/"+a.id} target="_blank" rel="noreferrer noopener">PDF ↗</a>}
            <div><span className="mono eyebrow">{a.role.toUpperCase()}</span>{["cover","gallery","portrait"].includes(a.role)&&<label className="studio-field"><span>Alt text · required before publication</span><input disabled={busy} value={a.alt} onChange={e=>changeAsset(i,"alt",e.target.value)}/></label>}<label className="studio-field"><span>Caption</span><textarea rows={2} disabled={busy} value={a.caption} onChange={e=>changeAsset(i,"caption",e.target.value)}/></label>
              <div className="file-actions"><a href={"/api/files/"+a.id+"?download=1"}>Download ↓</a>
                <button disabled={busy||i===0} className="quiet-button" aria-label={"Move "+a.role+" earlier"} onClick={()=>{const refs=[...d!.assets];[refs[i-1],refs[i]]=[refs[i],refs[i-1]];set("assets",refs);}}>Move up ↑</button>
                <button disabled={busy} className="quiet-button" onClick={()=>setConfirm({title:"Remove this attachment?",message:"It will be detached from this draft. The published version and stored file remain unchanged until you update them.",run:async()=>{set("assets",d!.assets.filter(ref=>ref.id!==a.id));}})}>Detach</button></div></div>
          </article>)}</div>
          {stored.length>0&&<details className="stored-files"><summary>Stored file library</summary><p className="small">A file can be deleted only when no draft or published version references it.</p>{stored.map(file=>{
            const used=d!.assets.some(a=>a.id===file.id)||entry.published?.assets.some(a=>a.id===file.id);
            return <div key={file.id}><span>{file.filename} <small>{(file.bytes/1024/1024).toFixed(2)} MB</small></span><button disabled={busy||!!used} className="quiet-button danger" onClick={()=>setConfirm({title:"Delete this unused file?",message:"Access is revoked immediately and the object is queued for permanent cleanup.",run:()=>act(async()=>{await api("/api/studio/assets/"+file.id,"DELETE");setStored(old=>old.filter(f=>f.id!==file.id));setMessage("File deleted.");})})}>{used?"In use":"Delete"}</button></div>;
          })}</details>}
        </div>}
        </section>
        <footer className="editor-footer"><span className="mono">REVISION {entry.revision} / {dirty?"UNSAVED CHANGES":"SAVED TO DATABASE"}</span><div><button className="quiet-button" disabled={busy} onClick={()=>setConfirm({title:"Reload saved content?",message:"Any unsaved changes in this tab will be discarded.",run:()=>act(async()=>{const all=await refresh();const current=all.find(e=>e.id===entry.id);if(current)apply(current);})})}>Reload saved</button>{!settings&&<button className="quiet-button danger" disabled={busy} onClick={remove}>Delete entry</button>}</div></footer>
      </>}
    </section>
    <dialog ref={dialog} aria-labelledby="confirmation-title" className="confirm-dialog" onCancel={()=>setConfirm(null)} onClose={()=>setConfirm(null)}>{confirm&&<><span className="mono eyebrow">PLEASE CONFIRM</span><h2 id="confirmation-title">{confirm.title}</h2><p>{confirm.message}</p>{confirm.match&&<label className="studio-field"><span>Type “{confirm.match}” to confirm.</span><input autoFocus value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>}<div><button type="button" className="quiet-button" onClick={()=>setConfirm(null)}>Cancel</button><button type="button" className="button" disabled={!!confirm.match&&confirmation!==confirm.match} onClick={()=>{const run=confirm.run;setConfirm(null);void run();}}>Confirm ↗</button></div></>}</dialog>
  </main>;
}
