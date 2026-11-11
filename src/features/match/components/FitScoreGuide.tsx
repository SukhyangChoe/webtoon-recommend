'use client';

import { useState } from 'react';
import { MatchDialog } from './MatchDialog';
import { FIT_SCORE_GUIDE_BANDS } from '../config/recommendationFitDisplay.mjs';

export function FitScoreGuide() {
  const [open,setOpen] = useState(false);
  return <><button type="button" className="wm-fit-help" aria-label="핏 점수 안내" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><span aria-hidden="true">?</span></button>
    {open ? <MatchDialog sheet titleId="wm-fit-guide-title" onClose={()=>setOpen(false)}><div className="wm-fit-guide"><h2 id="wm-fit-guide-title">핏 점수란?</h2><p>내 취향과 이 작품의 이야기·소재·작화 요소가 얼마나 겹치는지 100점 기준으로 보여줘요. 테스트 답변과 내가 등록한 추천작이 반영돼요.</p><ul>{FIT_SCORE_GUIDE_BANDS.map(band=><li key={band.min}><strong>{band.min}–{band.max}점</strong><span>{band.label}</span></li>)}</ul></div></MatchDialog> : null}
  </>;
}
