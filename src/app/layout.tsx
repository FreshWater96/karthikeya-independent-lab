import type {Metadata} from "next";
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:{default:"Karthikeya — Independent Lab",template:"%s — Karthikeya"},
  description:"An evolving collection of research, projects, and experiments.",
  metadataBase:new URL(process.env.SITE_URL||"http://127.0.0.1:3000"),
  icons:{icon:"/icon.svg"},
  robots:process.env.SITE_MODE==="public"?{index:true,follow:true}:{index:false,follow:false},
  openGraph:{type:"website",siteName:"Karthikeya — Independent Lab",images:[{url:"/opengraph-image",width:1200,height:630,alt:"Karthikeya — Independent Lab"}]},
  twitter:{card:"summary_large_image"}
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a>{children}</body></html>;
}
