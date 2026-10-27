import type { CSSProperties } from "react";

const paths = {
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M9 5l7 7-7 7",
  book: "M12 6v15M12 6C9 4 5 3.5 2 4v15c3-.5 7 0 10 2 3-2 7-2.5 10-2V4c-3-.5-7 0-10 2Z",
  down: "M5 9l7 7 7-7",
  share: "M12 16V3m-5 5 5-5 5 5M5 12H3v9h18v-9h-2",
  download: "M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  eyeOff: "M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-3.1 4M6.1 6.1A17 17 0 0 0 2 12s3 7 10 7a11 11 0 0 0 5.9-1.7",
  settings: "M9 3h6l.6 3 2.6 1.5 2.8-.9 3 5.2-2.2 2v3L24 19l-3 5.2-2.8-.9-2.6 1.5-.6 3H9l-.6-3-2.6-1.5-2.8.9L0 19l2.2-2v-3L0 11.8l3-5.2 2.8.9L8.4 6 9 3",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

export function MatchIcon({ name, className = "", style }: { name: keyof typeof paths; className?: string; style?: CSSProperties }) {
  return <svg className={`wm-icon ${className}`} style={style} width="20" height="20" viewBox={name === "settings" ? "-2 1 28 28" : "0 0 24 24"} fill="none" stroke="currentColor" strokeWidth={name === "more" ? 3.5 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} />{name === "settings" ? <circle cx="12" cy="15" r="4" /> : null}</svg>;
}
