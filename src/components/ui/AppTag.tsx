import type { ReactNode } from "react";

type AppTagProps = {
  children: ReactNode;
  className?: string;
};

export function AppTag({ children, className = "" }: AppTagProps) {
  return <span className={["app-tag", className].filter(Boolean).join(" ")}>{children}</span>;
}