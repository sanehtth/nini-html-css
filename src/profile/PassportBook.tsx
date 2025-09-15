
import React, { useEffect, useState } from "react";
type Item = { topicCode:string; title:string; countryName:string; stamped:boolean; stampOn?:string|null; stampOff?:string|null };
export default function PassportBook({ userId }:{ userId:string }){
  const [items, setItems] = useState<Item[]>([]);
  useEffect(()=>{ fetch(`/.netlify/functions/passport-get?userId=${userId}`).then(r=>r.json()).then(js=>setItems(js.items||[])); }, [userId]);
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-3">
      <h3 className="text-xl font-semibold">Passport khám phá của bé</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(it=>(
          <div key={it.topicCode} className="border rounded-xl p-3 bg-white/80">
            <div className="text-sm text-gray-600">{it.countryName}</div>
            <div className="font-semibold">{it.title}</div>
            <div className="mt-2 aspect-[3/2] rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
              {it.stampOn || it.stampOff
                ? <img src={(it.stamped ? it.stampOn : it.stampOff) || undefined} alt="stamp" className="max-h-full object-contain" />
                : <div className={`text-3xl ${it.stamped ? "opacity-100" : "opacity-30"}`}>🛂</div>}
            </div>
            <div className="mt-1 text-xs">{it.stamped ? "ĐÃ ĐÓNG MỘC" : "Chưa đóng mộc"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
