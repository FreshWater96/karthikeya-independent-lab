import Link from "next/link";
import {publicAccess,authReady} from "@/lib/auth";
import {settings} from "@/lib/db";
import Navigation from "@/components/navigation";
import {Footer} from "@/components/content";
export default async function SiteLayout({children}:{children:React.ReactNode}){
  if(!(await publicAccess()))return <main id="main" className="locked-page"><div className="mono eyebrow">KARTHIKEYA / INDEPENDENT LAB</div><h1>A little space.<br/>Still taking shape.</h1><p>This preview is private. Only the owner can enter.</p><Link href="/studio" className="button">{authReady()?"Owner sign-in ↗":"Owner setup ↗"}</Link><span className="mono locked-caption">NOT PUBLISHED</span></main>;
  const config=await settings();
  return <><Navigation name={config.displayName||"Karthikeya"}/><main id="main">{children}</main><Footer settings={config}/></>;
}
