
import React, { useEffect, useMemo, useRef, useState } from "react";
import NiNiActor, { useDefaultSpeak } from "@/components/NiNiActor";
import HotspotHint from "@/components/HotspotHint";
import "@/styles/nini-actor.css";
import "@/styles/hint.css";

type Scene = { id:string; title?:string; image:{ low:string; mid:string; high:string }; hotspots:any[] };
export default function GameNiniExploreU5({ userId, topicCode }:{ userId:string; topicCode:string }){
  const [sessionId, setSessionId] = useState<string>("");
  const [scene, setScene] = useState<Scene|null>(null);
  const [msg, setMsg] = useState<string>("");
  const [visitedCount, setVisitedCount] = useState(0);
  const [totalScenes, setTotalScenes] = useState(0);
  const [chest, setChest] = useState<{ chestId:number }|null>(null);
  const [hint, setHint] = useState<{ x:number; y:number; r:number }|null>(null);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const niniRef = useRef<any>(null);
  const speak = useDefaultSpeak();

  const start = async ()=>{
    const r = await fetch("/.netlify/functions/u5-explore-start", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId, topicCode }) });
    const js = await r.json();
    setSessionId(js.sessionId);
    setScene(js.scene);
    setVisitedCount(js.visitedCount||0);
    setTotalScenes(js.totalScenes||0);
    setChest(js.chest||null);
    setMsg(js.intro||"");
  };

  const next = async ()=>{
    if (!sessionId) return;
    const r = await fetch(`/.netlify/functions/u5-explore-next?sessionId=${sessionId}`);
    const js = await r.json();
    setScene(js.scene);
    setVisitedCount(js.visitedCount||0);
    setTotalScenes(js.totalScenes||0);
    setChest(js.chest||null);
    setMsg("");
    setHint(null);
  };

  const tap = async (targetId:string)=>{
    if (!sessionId) return;
    const r = await fetch("/.netlify/functions/u5-explore-tap", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    const js = await r.json();
    if (js.sound){ try { audioRef.current!.src = js.sound; audioRef.current!.play(); } catch {} }
    niniRef.current?.currentAPI?.celebrate("Giỏi quá! Mình cùng khám phá tiếp nhé!");
    setHint(null);
  };

  const collectChest = async ()=>{
    if (!sessionId || !chest) return;
    const r = await fetch("/.netlify/functions/u5-explore-collect-chest", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId, chestId: chest.chestId }) });
    const js = await r.json();
    setMsg(js.awarded?.grand ? "Bé mở rương & nhận phần thưởng lớn!" : "Bé đã mở rương!");
    setChest(null);
  };

  const finish = async ()=>{
    if (!sessionId) return;
    const r = await fetch("/.netlify/functions/u5-explore-finish", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId }) });
    const js = await r.json();
    setMsg(js.stampedGrade ? "Đã đóng mộc Passport: Hoàn thành xuất sắc! 🎉" : "Hẹn gặp lại lần sau nhé!");
  };

  useEffect(()=>{ start(); }, []);

  const boxes = useMemo(()=>{
    if (!scene) return [];
    return scene.hotspots.map((h:any, i:number)=>{
      if (h.shape === "circle" && Array.isArray(h.c)) {
        const [cx, cy, r] = h.c as [number,number,number];
        return { key:i, type:"circle", targetId:h.targetId, cx, cy, r };
      }
      const [x,y,w,h2] = (h.xywh||[0,0,0,0]) as [number,number,number,number];
      return { key:i, type:"rect", targetId:h.targetId, x, y, w, h2 };
    });
  }, [scene]);

  // Idle hint after 8s
  useEffect(()=>{
    if (!scene) return;
    const t = setTimeout(()=>{
      const circles = scene.hotspots.filter((h:any)=>h.shape==="circle" && Array.isArray(h.c));
      if (circles.length){
        const h = circles[Math.floor(Math.random()*circles.length)];
        const [cx, cy, r] = h.c;
        niniRef.current?.currentAPI?.pointAt(cx - r*0.8, cy + r*0.8, 900);
        setHint({ x: cx, y: cy, r });
        speak("Bé thử chạm vào đây xem nhé!");
      }
    }, 8000);
    return ()=> clearTimeout(t);
  }, [scene]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-3">
      <audio ref={audioRef} />
      <div className="text-sm text-gray-700">Đã ghé thăm: <b>{visitedCount}/{totalScenes}</b> bức tranh của chủ đề</div>
      {scene && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border bg-black/5">
          <picture>
            <source srcSet={scene.image.high} media="(min-width: 1280px)" />
            <source srcSet={scene.image.mid} media="(min-width: 640px)" />
            <img src={scene.image.low} alt={scene.title||"Scene"} className="w-full h-full object-cover" decoding="async" />
          </picture>

          {/* NiNi overlay */}
          <NiNiActor ref={niniRef} speakText={speak} />
          {hint && <HotspotHint x={hint.x} y={hint.y} r={hint.r} />}

          {/* Hotspots clickable */}
          <div className="absolute inset-0">
            {boxes.map(b=> b.type==="circle"
              ? <button key={b.key} className="absolute rounded-full focus:outline-none"
                        style={{ left:`calc(${b.cx*100}% - ${b.r*100}%)`, top:`calc(${b.cy*100}% - ${b.r*100}%)`, width:`${b.r*200}%`, height:`${b.r*200}%` }}
                        onClick={()=>tap(b.targetId)} aria-label={b.targetId} />
              : <button key={b.key} className="absolute focus:outline-none"
                        style={{ left:`${b.x*100}%`, top:`${b.y*100}%`, width:`${b.w*100}%`, height:`${b.h2*100}%` }}
                        onClick={()=>tap(b.targetId)} aria-label={b.targetId} />
            )}
          </div>

          {chest && (
            <button className="absolute right-4 bottom-4 px-4 py-2 rounded-full bg-amber-600 text-white shadow" onClick={collectChest}>
              Mở Rương
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button className="px-3 py-2 rounded bg-slate-700 text-white" onClick={next}>Tiếp theo</button>
        <button className="px-3 py-2 rounded bg-emerald-700 text-white" onClick={finish}>Kết thúc</button>
      </div>
      {msg && <div className="text-sm text-blue-700">{msg}</div>}
    </div>
  );
}
