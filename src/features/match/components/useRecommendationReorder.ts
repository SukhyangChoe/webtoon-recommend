'use client';

import { useEffect,useRef,useState } from 'react';

type Item={canonicalWebtoonId:string};
export function useRecommendationReorder(items:Item[],disabled:boolean,onChange:(ids:string[])=>void,onSave:(ids:string[],previous:string[])=>Promise<void>) {
  const list=useRef<HTMLOListElement>(null),latest=useRef({items,onChange,onSave});
  const [dragging,setDragging]=useState<string|null>(null);
  useEffect(()=>{latest.current={items,onChange,onSave};},[items,onChange,onSave]);
  useEffect(()=>{
    const root=list.current;if(!root||disabled)return;
    let candidate:{id:string;x:number;y:number;pointer?:number;touch?:number}|null=null;
    let drag:{id:string;before:string[];order:string[]}|null=null,ghost:HTMLElement|null=null;
    let hold:ReturnType<typeof setTimeout>|null=null,suppressClick=false;
    const tile=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLElement>('[data-reorder-id]'):null;
    const clearHold=()=>{if(hold!==null)clearTimeout(hold);hold=null;};
    const cleanup=()=>{clearHold();ghost?.remove();ghost=null;candidate=null;setDragging(null);};
    const begin=(id:string,x:number,y:number)=>{
      const ids=latest.current.items.map(item=>item.canonicalWebtoonId);if(ids.length<2)return;
      drag={id,before:ids,order:ids};setDragging(id);suppressClick=true;
      const source=[...root.children].find(el=>(el as HTMLElement).dataset.reorderId===id)?.querySelector('.wm-work-cover');
      if(source){ghost=source.cloneNode(true) as HTMLElement;ghost.classList.add('wm-library-drag-preview');ghost.setAttribute('aria-hidden','true');ghost.style.left=`${x}px`;ghost.style.top=`${y}px`;document.body.appendChild(ghost);}
    };
    const move=(x:number,y:number)=>{
      if(!drag)return;
      if(ghost){ghost.style.left=`${x}px`;ghost.style.top=`${y}px`;}
      const target=tile(document.elementFromPoint(x,y));if(!target||!root.contains(target))return;
      const to=drag.order.indexOf(target.dataset.reorderId!),from=drag.order.indexOf(drag.id);
      if(to>=0&&to!==from){const next=[...drag.order];next.splice(to,0,next.splice(from,1)[0]);drag.order=next;latest.current.onChange(next);}
      if(y>innerHeight-64)window.scrollBy(0,16);else if(y<110)window.scrollBy(0,-16);
    };
    const finish=()=>{
      const saved=drag;drag=null;cleanup();
      if(saved&&saved.order.some((id,index)=>id!==saved.before[index]))void latest.current.onSave(saved.order,saved.before);
    };
    const cancel=()=>{if(drag)latest.current.onChange(drag.before);drag=null;cleanup();};
    const down=(event:PointerEvent)=>{
      if(!event.isPrimary||event.pointerType==='mouse'&&event.button!==0)return;
      const source=tile(event.target);if(!source)return;
      const handle=event.target instanceof Element&&event.target.closest('[data-reorder-handle]');
      if(event.pointerType==='touch'&&!handle)return;
      suppressClick=false;candidate={id:source.dataset.reorderId!,x:event.clientX,y:event.clientY,pointer:event.pointerId};
      if(handle){event.preventDefault();begin(candidate.id,event.clientX,event.clientY);root.setPointerCapture(event.pointerId);}
    };
    const pointerMove=(event:PointerEvent)=>{
      if(!candidate||candidate.pointer!==event.pointerId)return;
      if(!drag&&Math.hypot(event.clientX-candidate.x,event.clientY-candidate.y)>=8){begin(candidate.id,event.clientX,event.clientY);root.setPointerCapture(event.pointerId);}
      if(drag){event.preventDefault();move(event.clientX,event.clientY);}
    };
    const up=(event:PointerEvent)=>{if(candidate?.pointer!==event.pointerId)return;if(root.hasPointerCapture(event.pointerId))root.releasePointerCapture(event.pointerId);finish();};
    const touchStart=(event:TouchEvent)=>{
      if(event.touches.length!==1){cancel();return;}
      if(event.target instanceof Element&&event.target.closest('[data-reorder-handle]'))return;
      const source=tile(event.target);if(!source)return;
      const touch=event.touches[0];suppressClick=false;candidate={id:source.dataset.reorderId!,x:touch.clientX,y:touch.clientY,touch:touch.identifier};
      hold=setTimeout(()=>{if(candidate)begin(candidate.id,candidate.x,candidate.y);},380);
    };
    const touchMove=(event:TouchEvent)=>{
      if(candidate?.touch===undefined)return;
      const touch=[...event.touches].find(t=>t.identifier===candidate?.touch);if(!touch)return;
      if(!drag){if(Math.hypot(touch.clientX-candidate.x,touch.clientY-candidate.y)>7){clearHold();candidate=null;}return;}
      event.preventDefault();move(touch.clientX,touch.clientY);
    };
    const touchEnd=()=>{if(candidate?.touch!==undefined)finish();};
    const click=(event:MouseEvent)=>{if(suppressClick&&event.detail){event.preventDefault();event.stopPropagation();suppressClick=false;}};
    const nativeDrag=(event:DragEvent)=>event.preventDefault();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&drag){event.preventDefault();cancel();return;}
      if(!(event.target instanceof Element)||!event.target.closest('[data-reorder-handle]'))return;
      const source=tile(event.target),ids=latest.current.items.map(item=>item.canonicalWebtoonId),from=ids.indexOf(source?.dataset.reorderId??'');
      const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3};
      if(from<0||offsets[event.key]===undefined)return;
      event.preventDefault();const to=Math.max(0,Math.min(ids.length-1,from+offsets[event.key]));if(from===to)return;
      const next=[...ids];next.splice(to,0,next.splice(from,1)[0]);latest.current.onChange(next);
      void latest.current.onSave(next,ids).then(()=>requestAnimationFrame(()=>root.querySelector<HTMLElement>(`[data-reorder-id="${source!.dataset.reorderId}"] [data-reorder-handle]`)?.focus()));
    };
    root.addEventListener('pointerdown',down);root.addEventListener('pointermove',pointerMove);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);
    root.addEventListener('touchstart',touchStart,{passive:true});root.addEventListener('touchmove',touchMove,{passive:false});root.addEventListener('touchend',touchEnd);root.addEventListener('touchcancel',cancel);
    root.addEventListener('click',click,true);root.addEventListener('dragstart',nativeDrag);root.addEventListener('keydown',key);window.addEventListener('blur',cancel);
    return()=>{cancel();root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',pointerMove);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel);root.removeEventListener('touchstart',touchStart);root.removeEventListener('touchmove',touchMove);root.removeEventListener('touchend',touchEnd);root.removeEventListener('touchcancel',cancel);root.removeEventListener('click',click,true);root.removeEventListener('dragstart',nativeDrag);root.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);};
  },[disabled,items.length]);
  return {list,dragging};
}
