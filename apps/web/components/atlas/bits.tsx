import { cn } from "@/lib/utils/cn";
import { VacancyStatus, STATUS_LABEL } from "@/lib/atlas/mock";

const STATUS_TONE: Record<VacancyStatus, string> = {
  adaptada: "border-brass/35 bg-brass/10 text-brass-soft",
  postulada: "border-depth/40 bg-depth/12 text-depth",
  entrevista: "border-depth/50 bg-depth/15 text-[#9AD0E6]",
  descartada: "border-caution/40 bg-caution/12 text-caution",
};

export function StatusBadge({ status }: { status: VacancyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        STATUS_TONE[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-brass">
      {children}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "match" | "gap";
}) {
  return (
    <span
      className={cn(
        "rounded-md border px-2.5 py-1 text-[12px]",
        tone === "match" && "border-depth/30 bg-depth/12 font-mono text-[13px] text-depth",
        tone === "gap" && "border-caution/30 bg-caution/12 font-mono text-[13px] text-caution",
        tone === "neutral" && "well text-ink-mid",
      )}
    >
      {children}
    </span>
  );
}

/** Page-level header: big display title + description. No rule. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        )}
        <h1 className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight text-ink-hi sm:text-[38px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-mid">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="well inline-flex rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-colors",
            value === o.id ? "bg-brass/15 text-brass-soft" : "text-ink-lo hover:text-ink-mid",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Big stat card: mono label + icon, large number, sub-line, and a visual slot. */
export function StatCard({
  label,
  icon,
  value,
  sub,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-lo">
          {label}
        </span>
        {icon && <span className="text-ink-lo/70">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[34px] font-semibold leading-none tracking-tight text-ink-hi">
          {value}
        </span>
        {sub && <span className="text-[12px] text-ink-mid">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/** Circular ring gauge with the score in the middle. */
export function CalceGauge({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  const color = value >= 85 ? "#F0C24C" : value >= 70 ? "#6BA8C4" : "#DB7C68";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,235,190,0.1)"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-ink-hi font-mono"
        style={{ fontSize: size * 0.3, fontWeight: 500 }}
      >
        {value}
      </text>
    </svg>
  );
}

/** Tiny inline sparkline from a series of 0–1 values. */
export function Sparkline({
  points,
  stroke = "#F0C24C",
  className = "",
}: {
  points: number[];
  stroke?: string;
  className?: string;
}) {
  const w = 120;
  const h = 34;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - p * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-8 w-full", className)} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
