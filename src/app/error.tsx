"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main id="main" className="locked-page"><span className="mono eyebrow">A MOMENTARY INTERRUPTION</span><h1>Something<br/>didn’t connect.</h1><p>The content couldn’t be loaded. Please try again in a moment.</p><button className="button" onClick={reset}>Try again ↗</button></main>;
}
