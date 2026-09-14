import {ImageResponse} from "next/og";
export const alt="Karthikeya — Independent Lab";
export const size={width:1200,height:630};
export const contentType="image/png";
export default function Image(){
  return new ImageResponse(<div style={{display:"flex",flexDirection:"column",background:"#f4f2eb",width:"100%",height:"100%",padding:"65px",color:"#171a1f",position:"relative"}}>
    <div style={{display:"flex",fontSize:20,letterSpacing:4}}>KARTHIKEYA / INDEPENDENT LAB</div>
    <div style={{display:"flex",flexDirection:"column",fontSize:100,letterSpacing:-6,lineHeight:1.05,marginTop:80}}><span>Ideas into</span><span>new dimensions.</span></div>
    <div style={{position:"absolute",display:"flex",width:250,height:250,border:"32px solid #2146f5",borderRadius:"50%",right:65,top:140,transform:"rotate(-30deg)",opacity:.8}}/>
    <div style={{display:"flex",fontSize:21,marginTop:65}}>RESEARCH / PROJECTS / EXPERIMENTS</div>
  </div>,size);
}
