"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-graphite-900 ring-1 ring-white/[0.07] ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[0.8rem] font-medium text-white/60">{label}</span>
      {children}
      {error ? <span className="text-xs text-signal-bright">{error}</span> : hint ? <span className="text-xs text-white/35">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-[0.92rem] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/35 disabled:opacity-50 aria-[invalid=true]:border-signal-bright";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} h-auto min-h-28 py-2.5 leading-relaxed ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 ${props.className ?? ""}`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} />;
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-left transition-colors hover:border-white/20 disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-white/40">{description}</span>}
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-ok" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "light" | "ghost" | "danger"; size?: "sm" | "md"; loading?: boolean };
export function Button({ variant = "ghost", size = "md", loading, className = "", children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-signal text-white hover:bg-signal-bright",
    light: "bg-white text-black hover:bg-white/85",
    ghost: "border border-white/12 text-white/85 hover:border-white/30 hover:text-white",
    danger: "border border-signal/40 text-signal-bright hover:bg-signal hover:text-white",
  }[variant];
  const s = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";
  return (
    <button {...rest} disabled={disabled || loading} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "ok" | "muted" | "warn" | "neutral" | "red"; children: ReactNode }) {
  const t = {
    ok: "bg-ok/12 text-ok",
    muted: "bg-white/5 text-white/45",
    warn: "bg-amber-400/10 text-amber-300",
    neutral: "bg-white/10 text-white/80",
    red: "bg-signal/15 text-signal-bright",
  }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${t}`}>{children}</span>;
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm ${tone === "ok" ? "bg-ok/10 text-ok" : "bg-signal/12 text-signal-bright"}`}>
      {children}
    </div>
  );
}

/** Modal confirmation dialog built on <dialog> (focus trap & Esc handled by the browser). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  confirmDisabled,
  loading,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmDisabled?: boolean;
  loading?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(92vw,440px)] rounded-3xl bg-graphite-900 p-0 text-white ring-1 ring-white/10 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 text-sm text-white/60">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={confirmDisabled} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
