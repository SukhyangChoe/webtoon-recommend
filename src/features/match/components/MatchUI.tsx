import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { matchQuestionProgress, matchScoreAngle } from "../config/uiTheme.mjs";
import { MatchIcon } from "./MatchIcon";

export function MatchButton({ children, secondary = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return <button type="button" {...props} className={`match-button${secondary ? " match-button--secondary" : ""} ${className}`.trim()}>{children}</button>;
}

export function MatchPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`match-card ${className}`.trim()}>{children}</section>;
}

export function MatchNavigation({ previous, disabled, onNext, label = "다음", type = "button" }: { previous: string; disabled: boolean; onNext?: () => void; label?: string; type?: "button" | "submit" }) {
  return <div className="match-navigation match-cyan-navigation"><Link className="match-button match-button--secondary" href={previous} aria-label="이전 화면"><MatchIcon name="chevron" className="is-back" /><span>이전</span></Link><MatchButton type={type} disabled={disabled} onClick={onNext}><span>{label}</span><MatchIcon name="chevron" /></MatchButton></div>;
}

export function MatchProgress({ screenOrder }: { screenOrder?: number }) {
  if (!screenOrder) return null;
  const progress = matchQuestionProgress(screenOrder);
  return <div className="match-progress" role="progressbar" aria-label="취향 테스트 진행률" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.current}><span style={{ width: `${progress.percent}%` }} /></div>;
}

export function MatchQuestionLayout({ progressLabel, progress, title, questionText, question, helperText, screenOrder, children }: { progressLabel?: string; progress?: string; title: string; questionText?: string; question?: string; helperText?: string; screenOrder?: number; children?: ReactNode }) {
  return <main className="match-page match-question-page"><MatchPanel><MatchProgress screenOrder={screenOrder} /><p className="match-eyebrow">{progressLabel ?? progress}</p><h1>{title}</h1><p className="match-question-text">{questionText ?? question}</p>{helperText ? <p className="match-helper">{helperText}</p> : null}{children}</MatchPanel></main>;
}

export function MatchScoreRing({ score }: { score: number }) {
  const bounded = matchScoreAngle(score) / 3.6;
  return <div className="match-cyan-score-ring" role="img" aria-label={`웹툰궁합 ${bounded}%`} style={{ "--score-angle": `${matchScoreAngle(score)}deg` } as CSSProperties}><div><strong>{bounded}</strong><span>%</span></div></div>;
}

export function MatchLoadingVisual() {
  return <div className="match-cyan-loading-visual" aria-hidden="true"><span>✦</span></div>;
}
