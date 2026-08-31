import { CompassRose } from "@/components/atlas/CompassRose";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brass/30 bg-brass/10">
          <CompassRose className="h-5 w-5 text-brass" />
        </span>
        <span className="font-display text-[19px] font-semibold tracking-tight text-ink-hi">
          Atlas
        </span>
      </div>
      {children}
    </div>
  );
}
