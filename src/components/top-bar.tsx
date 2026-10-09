"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/today", label: "Today" },
  { href: "/habits", label: "Habits" },
  { href: "/progress", label: "Progress" },
];

export function TopBar({ menu }: { menu?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-topbar">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-8 px-8">
        <span className="font-display text-xl">Cadence</span>
        <nav className="flex gap-6">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-semibold text-ink"
                    : "text-ink-muted hover:text-ink"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {menu}
        </div>
      </div>
    </header>
  );
}
