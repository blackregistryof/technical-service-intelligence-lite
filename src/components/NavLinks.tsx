"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/rikketeated", label: "Rikketeated" },
  { href: "/seadmed", label: "Seadmed" },
] as const;

const baseClass =
  "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Põhinavigatsioon">
      <ul className="flex gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`${baseClass} ${
                  isActive
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function NavLinksFallback() {
  return (
    <nav aria-label="Põhinavigatsioon">
      <ul className="flex gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`${baseClass} text-slate-700 hover:bg-slate-100`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
