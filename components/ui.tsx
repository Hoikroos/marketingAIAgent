import { Sparkles, Loader2 } from "./icons";

export function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tone = "up",
}: {
  icon: any;
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card card-hover p-4 flex items-center gap-3 animate-in">
      <div className="h-11 w-11 rounded-xl bg-[#1b98e0]/15 grid place-items-center text-violet-300 shrink-0">
        <Icon size={21} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-400 truncate">{label}</div>
        <div className="text-2xl font-black mt-0.5">{value}</div>
        {delta && (
          <div className={`text-[10px] mt-1 ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`}>
            {tone === "up" ? "▲" : "▼"} {delta} so với kỳ trước
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  action,
  onAction,
  href,
}: {
  icon?: any;
  title: string;
  action?: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-extrabold flex items-center gap-2 tracking-tight">
        {Icon && <Icon size={18} className="text-violet-400" />}
        {title}
      </h2>
      {action && href && (
        <a href={href} className="text-xs text-violet-300 hover:text-white transition">
          {action}
        </a>
      )}
      {action && !href && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs text-violet-300 hover:text-white transition"
        >
          {action}
        </button>
      )}
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-300",
  yellow: "bg-amber-500/15 text-amber-300",
  red: "bg-rose-500/15 text-rose-300",
  purple: "bg-[#1b98e0]/15 text-violet-300",
  blue: "bg-sky-500/15 text-sky-300",
  gold: "bg-[#e8b563]/15 text-[#f0c684]",
};

export function Status({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${TONE_CLASSES[tone] || TONE_CLASSES.blue}`}>{children}</span>;
}

export function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card py-16 text-center animate-in">
      <Sparkles className="mx-auto text-violet-400" size={30} />
      <h3 className="font-bold mt-3">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
  );
}

export function Spinner({ size = 15 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-soft)] text-xs last:border-b-0">
      {label && <span>{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-5 w-9 rounded-full relative transition-colors shrink-0 ${checked ? "bg-[#1b98e0]" : "bg-[var(--panel3)]"}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-3 w-3 bg-white rounded-full transition-all ${checked ? "right-1" : "left-1"}`}
        />
      </button>
    </div>
  );
}
