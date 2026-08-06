import type { ElementType, ReactNode } from "react";

type PageContainerSize = "default" | "test" | "result";

type PageContainerProps = {
  children: ReactNode;
  size?: PageContainerSize;
  className?: string;
  as?: ElementType;
};

export function PageContainer({
  children,
  size = "default",
  className = "",
  as: Component = "div",
}: PageContainerProps) {
  const classes = [
    "page-container",
    `page-container--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={classes}>{children}</Component>;
}