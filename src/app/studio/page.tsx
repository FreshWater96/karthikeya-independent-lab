import type {Metadata} from "next";
import Link from "next/link";
import {owner,authReady} from "@/lib/auth";
import Studio from "@/components/studio";
export const metadata:Metadata={title:"Content studio",robots:{index:false,follow:false}};
export default async function StudioPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const session=await owner(),{error}=await searchParams;
  if(!session)return <main id="main" className="studio-login"><Link href="/" className="mono">← INDEPENDENT LAB</Link><div><span className="mono eyebrow">OWNER-ONLY CONTENT STUDIO</span><h1>Behind<br/>the work.</h1><p>One quiet place to shape the collection.</p>{error&&<p role="alert" className="error-text">{error==="not-owner"?"That GitHub account is not the configured owner.":"Sign-in could not complete. Please try again and check your OAuth configuration."}</p>}
    {authReady()?<a className="button" href="/api/auth/login">Sign in with GitHub ↗</a>:<section className="setup-notice"><h2>Administration is locked.</h2><p>Configure DATABASE_URL, AUTH_SECRET, OWNER_GITHUB_ID, GITHUB_CLIENT_ID, and GITHUB_CLIENT_SECRET on the server. See SETUP.md in the repository. Nothing is writable until owner identity is verified.</p><p>File uploads additionally need a private S3-compatible bucket. Do not paste credentials into this page or commit them to GitHub.</p></section>}</div><span className="mono">NO PUBLIC SIGNUPS. NO DEFAULT PASSWORDS.</span></main>;
  return <Studio/>;
}
