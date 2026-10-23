"use client";

import { useEffect, useRef, useState } from "react";

type Point3 = [number, number, number];
type Point2 = { x: number; y: number };

const projects = [
  {
    number: "03", year: "2026", title: "Vertical Property Atlas", place: "Amsterdam · Zuidas",
    type: "Spatial computing / Digital twin",
    description: "A parcel-to-property exploration system that connects urban context, building storeys, legal volumes and BIM into one navigable spatial interface.",
    tags: ["3D ULPIN", "CesiumJS", "BIM / IFC"], accent: "#1746ff",
    url: "https://amsterdam-3d-property.tammineedisriramkart.chatgpt.site/",
  },
  {
    number: "04", year: "2026", title: "Antarctic Remote Operations", place: "Indian Research Stations",
    type: "Environmental interface / Simulation",
    description: "An interactive operating environment for distant research infrastructure, combining station geometry, live systems and scientific model outputs.",
    tags: ["Digital twin", "Ocean models", "Remote systems"], accent: "#15a8c9", url: undefined,
  },
  {
    number: "05", year: "2026", title: "TrackMate AGV", place: "University prototype",
    type: "Robotics / Physical computing",
    description: "A compact autonomous material-transport prototype designed as a practical test bed for sensing, navigation and low-cost indoor automation.",
    tags: ["Arduino", "Navigation", "Prototype"], accent: "#ff5b2d", url: undefined,
  },
];

const researchProjects = [
  {
    number: "01",
    field: "Artificial molecular ecology",
    title: "Evolutionary Memory in an RNA-Like Ecology",
    thesis: "Recurrence interval and recognition-motif loss jointly determine whether a molecular population can remember and respond to a returning environment.",
    question: "How long does evolutionary memory persist when environmental challenges recur but the molecular motifs needed for recognition are progressively lost?",
    methods: ["A–B–A challenge schedule", "Targeted sequence acquisition", "Multi-motif memory model"],
    metrics: [
      { value: "12,000", label: "Principal simulations" },
      { value: "A–B–A", label: "Recurrence protocol" },
      { value: "2 axes", label: "Interval × motif loss" },
    ],
    result: "The study maps memory as a joint consequence of recurrence timing and motif retention, rather than treating adaptation as a single-event response.",
    accent: "#1746ff",
  },
  {
    number: "02",
    field: "Green chemistry / Chemoinformatics",
    title: "Machine-Learning Screening of Green Catalysts",
    thesis: "A descriptor-based workflow ranks catalysts for alcohol oxidation by combining predictive performance with a purpose-built Green Performance Index.",
    question: "Can molecular descriptors and small-data machine learning identify catalyst systems that balance reaction performance with greener operating conditions?",
    methods: ["RDKit molecular descriptors", "Gradient boosting + random forest", "Green Performance Index"],
    metrics: [
      { value: "26", label: "Reaction entries" },
      { value: "33", label: "Model columns" },
      { value: "15.87", label: "Best MAE" },
    ],
    result: "The framework turns scattered reaction data into a reproducible screening pipeline, making catalyst comparison more transparent and sustainability-aware.",
    accent: "#159a62",
  },
];

function ArchitecturalModel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0.25, y: -0.12 });
  const [exploded, setExploded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0, width = 0, height = 0, dpr = 1, angle = 0.52, pitch = -0.32, raf = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const project = ([x, y, z]: Point3): Point2 => {
      const ca = Math.cos(angle), sa = Math.sin(angle), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const rx = x * ca - z * sa, rz = x * sa + z * ca, ry = y * cp - rz * sp, depth = y * sp + rz * cp;
      const scale = Math.min(width, height) * 0.063 * (1 + depth * 0.008);
      return { x: width * 0.53 + rx * scale, y: height * 0.54 - ry * scale };
    };
    const line = (a: Point3, b: Point3, alpha = 1, lineWidth = 1) => {
      const p1 = project(a), p2 = project(b);
      context.beginPath(); context.moveTo(p1.x, p1.y); context.lineTo(p2.x, p2.y);
      context.strokeStyle = `rgba(23, 70, 255, ${alpha})`; context.lineWidth = lineWidth; context.stroke();
    };
    const draw = () => {
      frame += 1;
      angle += (0.46 + pointer.current.x * 0.32 - angle) * 0.035;
      pitch += (-0.31 + pointer.current.y * 0.15 - pitch) * 0.04;
      context.clearRect(0, 0, width, height);
      const floorCount = 9, baseY = -4.2, floorH = 1.05, gap = exploded ? 0.45 : 0;
      const footprint = [[-3.3,-2.1],[2.75,-2.1],[3.3,1.7],[-2.45,2.35]] as [number, number][];
      for (let i = -9; i <= 9; i += 1) { line([-10, baseY, i], [10, baseY, i], 0.12); line([i, baseY, -9], [i, baseY, 9], 0.12); }
      for (let floor = 0; floor <= floorCount; floor += 1) {
        const y = baseY + floor * (floorH + gap), inset = floor > 6 ? (floor - 6) * 0.24 : 0;
        const shape = footprint.map(([x,z]) => [x * (1 - inset * 0.04), z * (1 - inset * 0.04)] as [number, number]);
        const points = shape.map(([x,z]) => project([x,y,z]));
        context.beginPath(); context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
        context.closePath(); context.fillStyle = floor === floorCount ? "rgba(23,70,255,.11)" : "rgba(23,70,255,.018)"; context.fill();
        context.strokeStyle = `rgba(23,70,255,${floor === floorCount ? 0.9 : 0.48})`; context.lineWidth = floor === floorCount ? 1.3 : 0.85; context.stroke();
        if (floor < floorCount) shape.forEach(([x,z], index) => {
          const [nx,nz] = floor === 6 && index > 1 ? [x * 0.96, z * 0.96] : [x,z]; line([x,y,z],[nx,y+floorH,nz],0.34,0.75);
        });
        if (exploded && floor > 0) {
          const c = project([3.55,y,0]); context.font = "10px ui-monospace, monospace"; context.fillStyle = "rgba(23,70,255,.74)"; context.fillText(String(floor).padStart(2,"0"),c.x+4,c.y+3);
        }
      }
      const scanY = baseY + ((frame * 0.012) % 1) * floorCount * (floorH + gap), a = project([-3.7,scanY,-2.5]), b = project([3.75,scanY,2.6]);
      const gradient = context.createLinearGradient(a.x,a.y,b.x,b.y); gradient.addColorStop(0,"rgba(23,70,255,0)"); gradient.addColorStop(.5,"rgba(23,70,255,.72)"); gradient.addColorStop(1,"rgba(23,70,255,0)");
      context.beginPath(); context.moveTo(a.x,a.y); context.lineTo(b.x,b.y); context.strokeStyle = gradient; context.lineWidth = 1.4; context.stroke();
      raf = requestAnimationFrame(draw);
    };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect(); pointer.current.x = (event.clientX - rect.left) / rect.width - .5; pointer.current.y = (event.clientY - rect.top) / rect.height - .5;
    };
    resize(); window.addEventListener("resize",resize); canvas.addEventListener("pointermove",onPointer); draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); canvas.removeEventListener("pointermove",onPointer); };
  }, [exploded]);

  return <div className="model-shell" aria-label="Interactive architectural model">
    <canvas ref={canvasRef} className="model-canvas" />
    <div className="model-coordinate model-coordinate-top">52.3402° N</div>
    <div className="model-coordinate model-coordinate-side">04.8724° E</div>
    <button className={`explode-button ${exploded ? "is-active" : ""}`} type="button" aria-pressed={exploded} onClick={() => setExploded(v => !v)}>
      <span>{exploded ? "Assemble" : "Explode"} model</span><span aria-hidden="true">{exploded ? "−" : "+"}</span>
    </button>
  </div>;
}

type AtlasView = "Parcel" | "Building" | "Storey" | "Property unit";

function VerticalPropertyInteraction() {
  const [selectedFloor, setSelectedFloor] = useState(6);
  const [exploded, setExploded] = useState(true);
  const [view, setView] = useState<AtlasView>("Property unit");
  const sceneRef = useRef<HTMLDivElement>(null);
  const floors = [9, 8, 7, 6, 5, 4, 3, 2, 1];

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    scene.style.setProperty("--atlas-rotate-x", `${58 - y * 10}deg`);
    scene.style.setProperty("--atlas-rotate-z", `${-35 + x * 12}deg`);
  };

  const resetPointer = () => {
    sceneRef.current?.style.setProperty("--atlas-rotate-x", "58deg");
    sceneRef.current?.style.setProperty("--atlas-rotate-z", "-35deg");
  };

  return <div className="atlas-interaction">
    <div className="atlas-topbar">
      <div><span className="atlas-live-dot" /> Interactive spatial index</div>
      <span>Zuidas / Amsterdam</span>
    </div>
    <div className="atlas-view-switcher" aria-label="Spatial hierarchy">
      {(["Parcel", "Building", "Storey", "Property unit"] as AtlasView[]).map(item =>
        <button key={item} type="button" className={view === item ? "is-active" : ""} aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>
      )}
    </div>
    <div className="atlas-stage" ref={sceneRef} onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
      <div className={`atlas-parcel ${view === "Parcel" ? "is-active" : ""}`}><span>P-0841</span></div>
      <div className={`atlas-building ${exploded ? "is-exploded" : ""} atlas-view-${view.toLowerCase().replace(" ", "-")}`}>
        {floors.map((floor, index) => <button
          key={floor}
          type="button"
          className={`atlas-floor ${selectedFloor === floor ? "is-selected" : ""}`}
          style={{ "--floor-index": index } as React.CSSProperties}
          aria-label={`Select storey ${floor}`}
          aria-pressed={selectedFloor === floor}
          onClick={() => { setSelectedFloor(floor); setView("Property unit"); }}
        >
          <span className="atlas-unit atlas-unit-a" />
          <span className="atlas-unit atlas-unit-b" />
          <span className="atlas-unit atlas-unit-c" />
          <span className="atlas-floor-number">{String(floor).padStart(2, "0")}</span>
        </button>)}
      </div>
      <div className="atlas-height-line"><span>+31.500 M</span></div>
      <div className="atlas-north">N<br />↑</div>
    </div>
    <aside className="atlas-inspector" aria-live="polite">
      <span className="atlas-inspector-label">Selected spatial object</span>
      <strong>{view === "Parcel" ? "PARCEL P-0841" : view === "Building" ? "BUILDING MASS" : `STOREY ${String(selectedFloor).padStart(2, "0")}`}</strong>
      <div><span>Layer</span><span>{view}</span></div>
      <div><span>Representation</span><span>{view === "Property unit" ? "Legal volumes" : "Geometry"}</span></div>
      <div><span>State</span><span>Mapped</span></div>
    </aside>
    <div className="atlas-actions">
      <button type="button" className="atlas-explode" aria-pressed={exploded} onClick={() => setExploded(value => !value)}>
        {exploded ? "Assemble volumes" : "Explode volumes"} <span>{exploded ? "−" : "+"}</span>
      </button>
      <a className="atlas-launch" href="https://amsterdam-3d-property.tammineedisriramkart.chatgpt.site/" target="_blank" rel="noreferrer">
        Launch live system <span aria-hidden="true">↗</span>
      </a>
    </div>
    <div className="atlas-caption"><span>Drag the view · Select a floor</span><span>Prototype / 3D vertical cadastre</span></div>
  </div>;
}

function IndexMark({ children }: { children: React.ReactNode }) { return <span className="index-mark">{children}</span>; }

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: .14 });
    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <main>
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Karthikeya home"><span className="wordmark-symbol" aria-hidden="true">K</span><span>Karthikeya</span></a>
      <p className="header-discipline">Independent Lab<br />Spatial systems & research</p>
      <nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#profile">Profile</a><a href="#contact">Contact</a></nav>
    </header>
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><IndexMark>00</IndexMark> Selected investigations · 2026</p>
        <h1><span>Systems for</span><span className="title-offset">physical <i>space.</i></span></h1>
        <p className="hero-intro">Research and prototypes at the intersection of digital twins, intelligent infrastructure and spatial computing.</p>
      </div>
      <ArchitecturalModel />
      <div className="hero-footer"><span>Visakhapatnam, India</span><span>17.6868° N — 83.2185° E</span><a href="#work">Scroll to index ↓</a></div>
    </section>
    <section className="statement reveal">
      <p><IndexMark>A</IndexMark> Practice</p>
      <h2>I build digital environments that make complex systems <em>legible, navigable and tangible.</em></h2>
    </section>
    <section className="work" id="work">
      <div className="section-heading reveal"><p><IndexMark>B</IndexMark> Work / research</p><p>Five active lines of enquiry</p></div>
      <div className="research-index" aria-label="Research projects">
        <div className="research-index-heading reveal">
          <p>Research dossiers</p>
          <p>Computational studies across molecular ecology and sustainable chemistry.</p>
        </div>
        {researchProjects.map(research => <article className="research-dossier reveal" key={research.number} style={{ "--research-accent": research.accent } as React.CSSProperties}>
          <div className="research-dossier-meta">
            <span>{research.number} / Research</span>
            <span>2026</span>
            <span>Independent study</span>
          </div>
          <div className="research-dossier-title">
            <p>{research.field}</p>
            <h3>{research.title}</h3>
          </div>
          <div className="research-question">
            <span>Research question</span>
            <p>{research.question}</p>
          </div>
          <div className="research-metrics" aria-label={`${research.title} key figures`}>
            {research.metrics.map(metric => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
          </div>
          <div className="research-dossier-body">
            <div><span className="research-label">Premise</span><p>{research.thesis}</p></div>
            <div><span className="research-label">Finding</span><p>{research.result}</p></div>
            <div><span className="research-label">Method stack</span><ul>{research.methods.map(method => <li key={method}>{method}</li>)}</ul></div>
          </div>
        </article>)}
      </div>
      <div className="applied-heading reveal"><p>Applied systems</p><p>Interactive spatial and physical prototypes.</p></div>
      <div className="project-list">{projects.map(project => <article className="project reveal" key={project.number} style={{ "--project-accent": project.accent } as React.CSSProperties}>
        <div className="project-meta"><span>{project.number}</span><span>{project.year}</span></div>
        <div className="project-title-wrap"><p>{project.type}</p><h3>{project.title}</h3></div>
        {project.title === "Vertical Property Atlas" ? <VerticalPropertyInteraction /> : <div className="project-plate" aria-hidden="true"><div className="plate-grid" /><span className="plate-volume plate-volume-a"/><span className="plate-volume plate-volume-b"/><span className="plate-axis plate-axis-x">X</span><span className="plate-axis plate-axis-y">Y</span><span className="plate-code">PLATE / {project.number}</span></div>}
        <div className="project-detail"><p className="project-place">{project.place}</p><div className="project-copy-block"><p>{project.description}</p>{project.url && <a className="project-live-link" href={project.url} target="_blank" rel="noreferrer">Open the live Vertical Property Mapping System <span aria-hidden="true">↗</span></a>}</div><ul>{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul></div>
      </article>)}</div>
    </section>
    <section className="profile reveal" id="profile">
      <div><p><IndexMark>C</IndexMark> Profile</p></div>
      <div className="profile-copy"><h2>Curious about the hidden architecture behind cities, machines and information.</h2><div className="profile-columns">
        <p>Karthikeya is a computer science student and independent researcher working across three-dimensional interfaces, robotics and urban digital twins.</p>
        <p>The lab is a place for ambitious prototypes: systems that begin as research questions and become interactive, testable spatial experiences.</p>
      </div></div>
    </section>
    <footer id="contact">
      <p><IndexMark>D</IndexMark> Open channel</p>
      <div className="footer-main"><h2>Build what does<br />not exist <i>yet.</i></h2><a className="contact-link" href="https://github.com/FreshWater96" target="_blank" rel="noreferrer">View GitHub <span aria-hidden="true">↗</span></a></div>
      <div className="footer-base"><span>© {new Date().getFullYear()} Karthikeya — Independent Lab</span><a href="#top">Back to top ↑</a></div>
    </footer>
  </main>;
}
