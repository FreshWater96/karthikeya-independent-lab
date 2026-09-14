import * as THREE from "three";
import {RoomEnvironment} from "three/examples/jsm/environments/RoomEnvironment.js";

function ribbon(scale:number,width:number,depth:number,phase:number){
  const points=Array.from({length:241},(_,i)=>{
    const t=i/240*Math.PI*2,r=1.32+.48*Math.cos(3*t+phase);
    return new THREE.Vector3(r*Math.cos(2*t),r*Math.sin(2*t),.67*Math.sin(3*t+phase)).multiplyScalar(scale);
  });
  const curve=new THREE.CatmullRomCurve3(points.slice(0,-1),true,"centripetal");
  const segments=280,sides=8,frames=curve.computeFrenetFrames(segments,true),positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=curve.getPointAt(t),twist=Math.sin(t*Math.PI*4+phase)*.6;
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2,x=Math.cos(a)*width,y=Math.sin(a)*depth;
      const nx=x*Math.cos(twist)-y*Math.sin(twist),ny=x*Math.sin(twist)+y*Math.cos(twist);
      const v=p.clone().addScaledVector(frames.normals[i],nx).addScaledVector(frames.binormals[i],ny);
      positions.push(v.x,v.y,v.z);
      if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function mountSculpture(host:HTMLElement,onLost:()=>void){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,60);camera.position.set(0,0,9);
  const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(environment,.04);
  scene.environment=target.texture;environment.dispose();pmrem.dispose();
  const group=new THREE.Group();scene.add(group);group.rotation.set(.2,-.5,-.4);
  const cobalt=new THREE.MeshPhysicalMaterial({color:"#1245ff",metalness:.76,roughness:.24,clearcoat:1,clearcoatRoughness:.2});
  const graphite=new THREE.MeshPhysicalMaterial({color:"#121725",metalness:.94,roughness:.17,clearcoat:.7});
  const satin=new THREE.MeshStandardMaterial({color:"#7b8ebb",metalness:.9,roughness:.3});
  const primary=new THREE.Mesh(ribbon(1,.29,.055,0),cobalt);group.add(primary);
  const secondary=new THREE.Mesh(ribbon(.73,.14,.07,1.2),graphite);secondary.rotation.set(.7,.3,1.2);group.add(secondary);
  const filament=new THREE.Mesh(new THREE.TorusKnotGeometry(.95,.012,160,6,2,3),satin);filament.rotation.z=.75;group.add(filament);
  for(let i=0;i<3;i++){
    const points=Array.from({length:181},(_,j)=>{const a=j/180*Math.PI*2;return new THREE.Vector3(Math.cos(a)*2.34,Math.sin(a)*2.34,0);});
    const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:"#8f9ab3",transparent:true,opacity:.35}));
    line.rotation.set(.8+i*.7,.3+i*.5,.1);group.add(line);
  }
  const network=[new THREE.Vector3(-2.2,.9,.4),new THREE.Vector3(2,-1.1,.6),new THREE.Vector3(.5,2,-.3),new THREE.Vector3(-1.9,-.9,-.6)];
  for(let i=0;i<network.length;i++){
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([network[i],network[(i+1)%network.length]]),new THREE.LineBasicMaterial({color:"#60718f",transparent:true,opacity:.18}));group.add(line);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.021,8,8),cobalt);dot.position.copy(network[i]);group.add(dot);
  }
  scene.add(new THREE.HemisphereLight("#e7eeff","#8c887e",2));
  const key=new THREE.DirectionalLight("#ffffff",5);key.position.set(3,4,5);scene.add(key);
  const fill=new THREE.DirectionalLight("#4873ff",3);fill.position.set(-4,-1,3);scene.add(fill);
  let width=1,height=1,frame=0,visible=true,dead=false,px=0,py=0,scroll=0,time=0,last=0;
  function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.position.z=camera.aspect<.8?10.7:9;camera.updateProjectionMatrix();draw();}
  function draw(){if(dead)return;renderer.render(scene,camera);}
  function loop(now:number){frame=0;if(dead||!visible||document.hidden)return;const dt=Math.min((now-last)/1000,.04);last=now;time+=dt;
    group.rotation.y+=(-.45+px*.11+Math.sin(time*.17)*.17+scroll*.22-group.rotation.y)*.035;
    group.rotation.x+=(.22+py*.09+Math.cos(time*.21)*.055-group.rotation.x)*.035;
    group.rotation.z=-.4+Math.sin(time*.13)*.055;group.position.y=Math.sin(time*.4)*.055+scroll*.08;
    secondary.rotation.z=1.2+Math.sin(time*.19)*.13;draw();frame=requestAnimationFrame(loop);
  }
  function update(){if(frame)cancelAnimationFrame(frame);frame=0;host.dataset.motionState=visible&&!document.hidden&&!dead?"playing":"paused";if(visible&&!document.hidden&&!dead){last=performance.now();frame=requestAnimationFrame(loop);}}
  function pointer(event:PointerEvent){const r=host.getBoundingClientRect();px=(event.clientX-r.left)/r.width-.5;py=(event.clientY-r.top)/r.height-.5;}
  function leave(){px=0;py=0;}
  function onScroll(){const r=host.getBoundingClientRect();scroll=THREE.MathUtils.clamp(-r.top/(r.height||1),0,1);}
  function lost(event:Event){event.preventDefault();onLost();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});observer.observe(host);
  host.addEventListener("pointermove",pointer);host.addEventListener("pointerleave",leave);
  renderer.domElement.addEventListener("webglcontextlost",lost);
  window.addEventListener("scroll",onScroll,{passive:true});document.addEventListener("visibilitychange",update);
  resize();update();
  return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();host.removeEventListener("pointermove",pointer);host.removeEventListener("pointerleave",leave);
    renderer.domElement.removeEventListener("webglcontextlost",lost);window.removeEventListener("scroll",onScroll);document.removeEventListener("visibilitychange",update);
    scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){object.geometry.dispose();const ms=Array.isArray(object.material)?object.material:[object.material];ms.forEach(m=>m.dispose());}});
    target.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  };
}
