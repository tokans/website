import { type CSSProperties, type ReactNode, type ChangeEvent, type KeyboardEvent } from "react";

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

// ─── Wordmark ─────────────────────────────────────────────────────────────────
export function Wordmark({ size = 26 }: { size?: number }) {
  const sizeVar: CSSVars = { "--ui-wordmark-size": `${size}px` };
  return (
    <div className="ui-wordmark" style={sizeVar}>
      Tok<span className="ui-wordmark-accent">ans</span>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  maxWidth,
}: {
  children:   ReactNode;
  className?: string;
  maxWidth?:  number;
}) {
  const cardVars: CSSVars | undefined =
    maxWidth !== undefined ? { "--ui-card-max-w": `${maxWidth}px` } : undefined;
  return (
    <div className={`ui-card ${className}`.trim()} style={cardVars}>
      {children}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label?:     string | undefined;
  hint?:      string | undefined;
  error?:     string | undefined;
  children:   ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && <label className="ui-field-label">{label}</label>}
      {children}
      {hint  && <div className="ui-field-hint">{hint}</div>}
      {error && <div className="ui-field-error">{error}</div>}
    </div>
  );
}

interface InputProps {
  type?:        string;
  placeholder?: string;
  value:        string;
  onChange:     (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?:   (e: KeyboardEvent<HTMLInputElement>) => void;
  className?:   string;
}

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`ui-input ${className}`.trim()}
    />
  );
}

interface TextareaProps {
  placeholder?: string;
  value:        string;
  onChange:     (e: ChangeEvent<HTMLTextAreaElement>) => void;
  maxLength?:   number;
  minHeight?:   number;
  className?:   string;
}

export function Textarea({
  className = "",
  maxLength,
  minHeight,
  value = "",
  onChange,
  ...props
}: TextareaProps) {
  const pct = maxLength ? value.length / maxLength : 0;
  const counterCls = pct > 0.9 ? "ui-textarea-counter ui-textarea-counter--warn" : "ui-textarea-counter";
  const taVars: CSSVars | undefined =
    minHeight !== undefined ? { "--ui-textarea-min-h": `${minHeight}px` } : undefined;
  return (
    <>
      <textarea
        {...props}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`ui-input ui-textarea ${className}`.trim()}
        style={taVars}
      />
      {maxLength && (
        <div className={counterCls}>
          {value.length} / {maxLength}
        </div>
      )}
    </>
  );
}

interface SelectProps {
  title:      string;
  value:      string;
  onChange:   (e: ChangeEvent<HTMLSelectElement>) => void;
  children:   ReactNode;
  className?: string;
}

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`ui-input ui-select ${className}`.trim()}
    >
      {children}
    </select>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
export function BtnPrimary({
  children, className = "", full = true, disabled = false, onClick,
}: {
  children:   ReactNode;
  className?: string;
  full?:      boolean;
  disabled?:  boolean;
  onClick?:   () => void;
}) {
  const cls = `ui-btn ui-btn--primary ${full ? "ui-btn--full" : ""} ${className}`.trim();
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function BtnGhost({
  children, className = "", onClick,
}: {
  children:   ReactNode;
  className?: string;
  onClick?:   () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`ui-btn ui-btn--ghost ${className}`.trim()}>
      {children}
    </button>
  );
}

export function BtnSocial({
  children, onClick, className = "",
}: {
  children:   ReactNode;
  onClick?:   () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`ui-btn ui-btn--social ui-btn--full ${className}`.trim()}>
      {children}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({
  value, total, label,
}: {
  value:  number;
  total:  number;
  label?: string;
}) {
  const pct = Math.round((value / total) * 100);
  const fillVar: CSSVars = { "--ui-progress-pct": `${pct}%` };
  return (
    <div className="ui-progress">
      <div className="ui-progress-track">
        <div className="ui-progress-fill" style={fillVar} />
      </div>
      {label && <div className="ui-progress-label">{label}</div>}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="ui-divider">
      <div className="ui-divider-line" />
      {label}
      <div className="ui-divider-line" />
    </div>
  );
}

// ─── Info box ─────────────────────────────────────────────────────────────────
type InfoVariant = "gold" | "success" | "neutral" | "error";

export function InfoBox({
  children,
  variant = "gold",
  className = "",
}: {
  children:   ReactNode;
  variant?:   InfoVariant;
  className?: string;
}) {
  return (
    <div className={`ui-info ui-info--${variant} ${className}`.trim()}>
      {children}
    </div>
  );
}

// ─── Step header ──────────────────────────────────────────────────────────────
export function StepHeader({
  eyebrow, title, sub,
}: {
  eyebrow?: string;
  title:    string;
  sub?:     string;
}) {
  return (
    <div className="ui-step-header">
      {eyebrow && <div className="ui-step-eyebrow">{eyebrow}</div>}
      <div className="ui-step-title">{title}</div>
      {sub && <div className="ui-step-sub">{sub}</div>}
    </div>
  );
}

// ─── Barrier list ─────────────────────────────────────────────────────────────
export function BarrierBox({
  title, steps, children,
}: {
  title?:    string;
  steps?:    string[];
  children?: ReactNode;
}) {
  return (
    <div className="ui-barrier">
      {title && <div className="ui-barrier-title">{title}</div>}
      {steps ? (
        <ul className="ui-barrier-list">
          {steps.map((s, i) => (
            <li key={i} className="ui-barrier-item">
              <span className="ui-barrier-num">{i + 1}</span>
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-barrier-text">{children}</div>
      )}
    </div>
  );
}

// ─── Fade-in animation ────────────────────────────────────────────────────────
export function FadeIn({ children, k }: { children: ReactNode; k: number | string }) {
  return (
    <div key={k} className="ui-fade-in">
      {children}
    </div>
  );
}
