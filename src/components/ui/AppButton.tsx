import Link from "next/link";
import type { ReactNode } from "react";

type AppButtonVariant = "primary" | "secondary" | "ghost";

type AppButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: AppButtonVariant;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  ariaLabel?: string;
};

export function AppButton({
  children,
  href,
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled = false,
  type = "button",
  onClick,
  ariaLabel,
}: AppButtonProps) {
  const classes = [
    "app-button",
    `app-button--${variant}`,
    fullWidth ? "app-button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}