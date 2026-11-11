'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function useDailyPickSheet(open:boolean, dialog:RefObject<HTMLDialogElement|null>, onClose:()=>void) {
  const handle=useRef<HTMLButtonElement>(null),closeRef=useRef(onClose);
  const [expanded,setExpanded]=useState(false);
  const expandedRef=useRef(false),actions=useRef({close:()=>{}});
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  useLayoutEffect(()=>{
    const sheet=dialog.current,grip=handle.current;
    if(!open||!sheet||!grip)return;
    let disposed=false,closing=false,suppressClick=false;
    let animation:Animation|null=null;
    let drag:{id:number;y:number;height:number;lastY:number;lastAt:number;velocity:number;moved:boolean}|null=null;
    const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heights=()=>({normal:Math.min(innerHeight*.82,760),max:innerHeight*.94});
    const setHeight=(height:number)=>sheet.style.setProperty('--daily-sheet-height',`${height}px`);
    const snap=(full:boolean)=>{
      expandedRef.current=full;setExpanded(full);
      delete sheet.dataset.dragging;
      setHeight(full?heights().max:heights().normal);
    };
    const close=()=>{
      if(closing)return;
      closing=true;drag=null;delete sheet.dataset.dragging;
      animation?.cancel();
      if(reduced()){closeRef.current();return;}
      animation=sheet.animate([{transform:'translateY(0)'},{transform:'translateY(105%)'}],{duration:220,easing:'cubic-bezier(.4,0,.8,.6)',fill:'forwards'});
      void animation.finished.then(()=>{if(!disposed)closeRef.current();}).catch(()=>{});
    };
    actions.current={close};
    setHeight(expandedRef.current?heights().max:heights().normal);
    if(!reduced())animation=sheet.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.25,1)'});
    const down=(event:PointerEvent)=>{
      if(!event.isPrimary||closing||event.pointerType==='mouse'&&event.button!==0)return;
      animation?.cancel();suppressClick=false;
      drag={id:event.pointerId,y:event.clientY,height:sheet.getBoundingClientRect().height,lastY:event.clientY,lastAt:performance.now(),velocity:0,moved:false};
      grip.setPointerCapture(event.pointerId);
    };
    const move=(event:PointerEvent)=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dy=event.clientY-drag.y,now=performance.now();
      if(Math.abs(dy)<5&&!drag.moved)return;
      drag.moved=true;event.preventDefault();sheet.dataset.dragging='true';
      drag.velocity=(event.clientY-drag.lastY)/Math.max(1,now-drag.lastAt);drag.lastY=event.clientY;drag.lastAt=now;
      setHeight(Math.max(160,Math.min(heights().max,drag.height-dy)));
    };
    const cancel=()=>{if(drag){drag=null;snap(expandedRef.current);}};
    const up=(event:PointerEvent)=>{
      if(!drag||event.pointerId!==drag.id)return;
      const current=drag;drag=null;
      if(grip.hasPointerCapture(event.pointerId))grip.releasePointerCapture(event.pointerId);
      if(!current.moved)return;
      suppressClick=true;
      const height=sheet.getBoundingClientRect().height,dy=event.clientY-current.y;
      if(height<heights().normal*.6||(dy>80&&current.velocity>.8))close();
      else snap(height>(heights().normal+heights().max)/2);
    };
    const click=(event:MouseEvent)=>{if(event.detail&&suppressClick){suppressClick=false;return;}snap(!expandedRef.current);};
    const key=(event:KeyboardEvent)=>{
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();snap(event.key==='ArrowUp');}
    };
    const resize=()=>{cancel();setHeight(expandedRef.current?heights().max:heights().normal);};
    grip.addEventListener('pointerdown',down);grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',up);
    grip.addEventListener('pointercancel',cancel);grip.addEventListener('lostpointercapture',cancel);grip.addEventListener('click',click);grip.addEventListener('keydown',key);
    window.addEventListener('resize',resize);window.addEventListener('blur',cancel);
    return()=>{
      disposed=true;animation?.cancel();delete sheet.dataset.dragging;
      grip.removeEventListener('pointerdown',down);grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',up);
      grip.removeEventListener('pointercancel',cancel);grip.removeEventListener('lostpointercapture',cancel);grip.removeEventListener('click',click);grip.removeEventListener('keydown',key);
      window.removeEventListener('resize',resize);window.removeEventListener('blur',cancel);actions.current={close:()=>{}};
    };
  },[open,dialog]);
  return {handle,expanded,close:useCallback(()=>actions.current.close(),[])};
}
