import Link from "next/link";
import { focusRing } from "@/components/ui/styles";

export type NavSection = "rikketeated" | "seadmed";

const NAV_ITEMS: { section: NavSection; href: string; label: string }[] = [
  { section: "rikketeated", href: "/rikketeated", label: "Rikketeated" },
  { section: "seadmed", href: "/seadmed", label: "Seadmed" },
];

/**
 * Main navigation (server component). The current section is passed in by the
 * section layout, so aria-current is part of the server HTML and works
 * without JavaScript, also on pages with dynamic parameters.
 */
export function NavLinks({ current }: { current: NavSection }) {
  return (
    <nav aria-label="Põhinavigatsioon">
      <ul className="flex gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.section === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium ${focusRing} ${
                  isActive
                    ? "bg-blue-50 text-blue-800 shadow-[inset_0_-2px_0_0] shadow-blue-700"
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
