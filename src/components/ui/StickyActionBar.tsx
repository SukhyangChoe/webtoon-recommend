import type { ReactNode } from "react";

type StickyActionBarProps = {
  children: ReactNode;
  className?: string;
};

export function StickyActionBar({
  children,
  className = "",
}: StickyActionBarProps) {
  return (
    <div className={["sticky-action-bar", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}