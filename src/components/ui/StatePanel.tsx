import { AppButton } from "@/components/ui/AppButton";

type StatePanelTone = "neutral" | "loading" | "empty" | "error";

type StatePanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: StatePanelTone;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
};

function StatePanelVisual({ tone }: { tone: StatePanelTone }) {
  if (tone === "neutral") return null;

  if (tone === "loading") {
    return (
      <span className="state-panel__visual" aria-hidden="true">
        <span className="state-panel__spinner" />
      </span>
    );
  }

  return (
    <span className="state-panel__visual" aria-hidden="true">
      {tone === "empty" ? (
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 3 2.9 19h18.2L12 3Z" />
          <path d="M12 8.2v5.4" />
          <circle cx="12" cy="16.7" r=".8" className="state-panel__icon-fill" />
        </svg>
      )}
    </span>
  );
}

export function StatePanel({
  eyebrow,
  title,
  description,
  tone = "neutral",
  primaryAction,
  secondaryAction,
}: StatePanelProps) {
  const isLoading = tone === "loading";
  const isError = tone === "error";

  return (
    <section
      className={`app-card state-panel state-panel--${tone}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={isLoading || undefined}
    >
      <div className="state-panel__content">
        <StatePanelVisual tone={tone} />
        {eyebrow ? <p className="state-panel__eyebrow">{eyebrow}</p> : null}
        <h2 className="state-panel__title">{title}</h2>
        {description ? (
          <p className="state-panel__description">{description}</p>
        ) : null}
        {primaryAction || secondaryAction ? (
          <div className="state-panel__actions">
            {primaryAction ? (
              <AppButton
                href={primaryAction.href}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </AppButton>
            ) : null}
            {secondaryAction ? (
              <AppButton
                href={secondaryAction.href}
                onClick={secondaryAction.onClick}
                variant="secondary"
              >
                {secondaryAction.label}
              </AppButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}