'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { clearWorkReturn, readWorkReturn, writeRailOffset } from '../storage/workReturnStorage.mjs';

/** Wait for the async recommendation list, then restore its viewport anchor and exact pixels. */
export function WorkReturnRestoration() {
  const pathname=usePathname(),params=useSearchParams();
  const path=pathname+(params.size?`?${params}`:'');
  const routes=useRef<{current:string;previous:string|null}>({current:path,previous:null});
  useEffect(()=>{
    if(routes.current.current!==path)routes.current={previous:routes.current.current,current:path};
    let storage:Storage;
    try { storage=window.sessionStorage; } catch { return; }
    const saved=readWorkReturn(storage);
    if(!saved)return;
    const historyReturn=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='back_forward';
    if(path!==saved.from){if(path!==saved.href)clearWorkReturn(storage);return;}
    if(routes.current.previous!==saved.href&&!historyReturn)return;
    let frame=0,stableSince=0,lastHeight=-1,finished=false;
    const started=performance.now();
    const inputs=['wheel','touchstart','pointerdown','keydown'] as const;
    const cleanup=()=>{
      cancelAnimationFrame(frame);
      for(const event of inputs)window.removeEventListener(event,cancel);
    };
    const finish=()=>{finished=true;clearWorkReturn(storage);cleanup();};
    const cancel=()=>finish();
    const restore=()=>{
      if(finished)return;
      if(performance.now()-started>20000){finish();return;}
      const rail=Array.from(document.querySelectorAll<HTMLOListElement>('[data-recommendation-rail]')).find(el=>el.dataset.recommendationRail===saved.railKey);
      if(rail&&rail.clientWidth){
        const left=Math.min(saved.left,Math.max(0,rail.scrollWidth-rail.clientWidth));
        rail.scrollTo({left,behavior:'instant'});
        writeRailOffset(storage,saved.railKey,left);
        const target=Math.max(0,window.scrollY+rail.getBoundingClientRect().top-saved.offset);
        window.scrollTo({top:target,behavior:'instant'});
        const height=document.documentElement.scrollHeight;
        if(height!==lastHeight){lastHeight=height;stableSince=performance.now();}
        // Covers have reserved aspect ratios. Brief stability allows Next's own
        // scroll/focus pass and the independent API requests to settle first.
        if(performance.now()-stableSince>350){finish();return;}
      }
      frame=requestAnimationFrame(restore);
    };
    for(const event of inputs)window.addEventListener(event,cancel,{passive:true});
    frame=requestAnimationFrame(restore);
    // A StrictMode replay or navigation cancels the attempt, without consuming it.
    return ()=>{finished=true;cleanup();};
  },[path]);
  return null;
}
