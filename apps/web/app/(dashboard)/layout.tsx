"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DeckProvider, ToastProvider } from "@/lib/atlas/store";
import { TopNav } from "@/components/atlas/TopNav";
import { CommandPalette } from "@/components/atlas/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <DeckProvider>
      <ToastProvider>
        <div className="flex min-h-screen w-full flex-col">
          <TopNav onOpenPalette={() => setPaletteOpen(true)} />
          <main className="flex-1">
            <div key={pathname} className="reveal">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </ToastProvider>
    </DeckProvider>
  );
}
