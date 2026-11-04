import { AppHeader } from "@/components/AppHeader";
import type { NavSection } from "@/components/NavLinks";

/**
 * Header and main area of a protected section. Used by the section layouts,
 * so the header (with the current-section marker) stays outside the
 * section's loading and error boundaries.
 */
export function AppShell({ current, children }: { current: NavSection; children: React.ReactNode }) {
  return (
    <>
      <AppHeader current={current} />
      <main id="sisu" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>
      {/* A plain paragraph, not a second <footer> landmark: the root layout already has one. */}
      <p className="mx-auto w-full max-w-[90rem] px-4 pb-4 text-xs text-slate-500 sm:px-6 lg:px-8">
        TSI Lite V0.1 · Sünteetilised andmed · Built with Claude Code
      </p>
    </>
  );
}
