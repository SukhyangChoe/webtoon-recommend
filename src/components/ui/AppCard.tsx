import type { HTMLAttributes, ReactNode } from "react";

type AppCardVariant = "default" | "hero" | "muted";

type AppCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: AppCardVariant;
  as?: "article" | "section" | "div";
};

export function AppCard({
  children,
  variant = "default",
  as: Component = "article",
  className = "",
  ...rest
}: AppCardProps) {
  const classes = [
    "app-card",
    variant !== "default" ? `app-card--${variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}