
import React from "react";
export default function HotspotHint({ x, y, r }:{ x:number; y:number; r:number }) {
  return (
    <div
      className="hotspot-hint pointer-events-none"
      style={{ left:`${x*100}%`, top:`${y*100}%`, width:`${r*200}%`, height:`${r*200}%` }}
    >
      <div className="ring" /><div className="ring delay" />
    </div>
  );
}
