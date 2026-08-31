"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Plus, ChevronDown, Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MODULES } from "@/lib/atlas/mock";
import { createClient } from "@/lib/supabase/client";
import { CompassRose } from "./CompassRose";

interface NavUser {
  name: string;
  email: string;
  avatar: string | null;
}

export function TopNav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUser({
        name: (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Cuenta",
        email: u.email ?? "",
        avatar: (u.user_metadata?.avatar_url as string) ?? null,
      });
    });
  }, []);

  const signOut = async () => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await createClient().auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };

  const initial = (user?.name || user?.email || "A").trim().charAt(0).toUpperCase();

  const isActive = (slug: string) =>
    pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);

  return (
    <header className="glass-bar sticky top-0 z-40 border-b border-[rgba(255,235,190,0.07)]">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-10">
        {/* brand */}
        <Link href="/adaptar" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brass/30 bg-brass/10">
            <CompassRose className="h-5 w-5 text-brass" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-ink-hi">
            Atlas
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {MODULES.map((m) => {
            const active = isActive(m.slug);
            return (
              <Link
                key={m.slug}
                href={`/${m.slug}`}
                className={cn(
                  "relative px-3 py-2 text-[14px] font-medium transition-colors",
                  active ? "text-brass" : "text-ink-mid hover:text-ink-hi",
                )}
              >
                {m.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-brass" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenPalette}
            aria-label="Buscar"
            className="hidden rounded-lg p-2 text-ink-mid transition-colors hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-hi sm:block"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          <Link
            href="/adaptar"
            className="flex items-center gap-1.5 rounded-full bg-brass px-3.5 py-2 text-[13px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft sm:px-5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva vacante</span>
          </Link>

          <span className="hidden h-6 w-px bg-[rgba(255,235,190,0.1)] sm:block" />

          {/* profile */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-[rgba(255,235,190,0.05)]"
            >
              <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-brass/40 bg-chart-raised text-[12px] font-semibold text-brass-soft">
                {user?.avatar ? (
                  <Image src={user.avatar} alt="" width={32} height={32} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-chart-bg bg-brass" />
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-mid" />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="card absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl py-1">
                  {user && (
                    <div className="border-b border-[rgba(255,235,190,0.07)] px-3.5 py-2.5">
                      <p className="truncate text-[13px] font-medium text-ink-hi">{user.name}</p>
                      <p className="truncate text-[11px] text-ink-lo">{user.email}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      signOut();
                    }}
                    className="block w-full px-3.5 py-2 text-left text-[13px] text-caution hover:bg-[rgba(255,235,190,0.05)]"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>

          {/* mobile toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menú"
            className="rounded-lg p-2 text-ink-mid hover:text-ink-hi md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-[rgba(255,235,190,0.07)] px-4 py-2 md:hidden">
          {MODULES.map((m) => (
            <Link
              key={m.slug}
              href={`/${m.slug}`}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-[14px] font-medium",
                isActive(m.slug)
                  ? "bg-brass/10 text-brass"
                  : "text-ink-mid hover:bg-[rgba(255,235,190,0.05)] hover:text-ink-hi",
              )}
            >
              {m.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
