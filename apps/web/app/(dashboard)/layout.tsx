"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DeckProvider, ToastProvider, useDeck } from "@/lib/atlas/store";
import { TopNav } from "@/components/atlas/TopNav";
import { CommandPalette } from "@/components/atlas/CommandPalette";
import { isProfileEmpty } from "@/lib/atlas/mock";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, hydrated } = useDeck();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Wait for localStorage to load — before that `profile` is always empty and
    // would bounce returning users to /perfil on every visit.
    if (!hydrated) return;
    // New account with no profile yet → send to /perfil to upload a CV first.
    if (isProfileEmpty(profile) && pathname !== "/perfil") {
      router.replace("/perfil");
    }
  }, [hydrated, profile, pathname, router]);

  return <>{children}</>;
}

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
        <OnboardingGuard>
          <div className="flex min-h-screen w-full flex-col">
            <TopNav onOpenPalette={() => setPaletteOpen(true)} />
            <main className="flex-1">
              <div key={pathname} className="reveal">
                {children}
              </div>
            </main>
          </div>
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </OnboardingGuard>
      </ToastProvider>
    </DeckProvider>
  );
}
