
import React, { useEffect, useRef, useState } from "react";

export type NiNiActorProps = {
  initial?: { x: number; y: number };
  onArrive?: () => void;
  speakText?: (text: string) => void;
  zIndex?: number;
  src?: string;
};
type Pose = "idle" | "walk" | "point" | "celebrate" | "talk";
export function useDefaultSpeak() {
  return (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /[ăâđêôơư]/i.test(text) ? "vi-VN" : "en-US";
      u.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };
}
export default function NiNiActor({ initial, onArrive, speakText, zIndex=30, src="/assets/nini.png" }: NiNiActorProps) {
  const ref = useRef<HTMLDivElement|null>(null);
  const [pos, setPos] = useState<{x:number;y:number}>(initial || { x: 0.12, y: 0.72 });
  const [pose, setPose] = useState<Pose>("idle");
  const [flip, setFlip] = useState(false);
  const say = speakText || useDefaultSpeak();
  // @ts-ignore
  (ref as any).currentAPI = {
    goto: (x:number, y:number, ms=1200) => goto(x,y,ms),
    pointAt: (x:number, y:number, ms=1200) => pointAt(x,y,ms),
    celebrate: (txt?:string) => celebrate(txt),
    say: (txt:string) => say(txt)
  };
  function goto(x:number, y:number, ms=1200) {
    setFlip(x < pos.x);
    setPose("walk");
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--nini-x", `${x*100}%`);
    el.style.setProperty("--nini-y", `${y*100}%`);
    el.style.setProperty("--nini-walk-ms", `${ms}ms`);
    setTimeout(() => {
      setPos({x,y});
      setPose("idle");
      onArrive && onArrive();
    }, ms + 30);
  }
  function pointAt(x:number, y:number, ms=1200) {
    goto(x,y,ms);
    setTimeout(()=> setPose("point"), ms + 40);
  }
  function celebrate(txt?:string) {
    setPose("celebrate");
    if (txt) say(txt);
    setTimeout(()=> setPose("idle"), 1500);
  }
  return (
    <div
      ref={ref}
      className={`nini-actor select-none pointer-events-none ${pose} ${flip ? "flip" : ""}`}
      style={{ zIndex, left: `var(--nini-x, ${pos.x*100}%)`, top: `var(--nini-y, ${pos.y*100}%)` }}
      aria-hidden
    >
      <img src={src} className="nini-img" alt="NiNi" />
      <div className="nini-shadow" />
    </div>
  );
}
