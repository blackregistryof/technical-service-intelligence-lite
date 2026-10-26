import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TSI Lite",
    template: "%s | TSI Lite",
  },
  description:
    "Sularahaautomaatide rikkekutsete ja tehnilise hoolduse ajaloo ülevaade (õppeotstarbeline prototüüp).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="et" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#sisu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900 focus:shadow"
        >
          Liigu põhisisu juurde
        </a>
        {children}
        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
            Õppeotstarbeline prototüüp. Kõik andmed on sünteetilised.
          </p>
        </footer>
      </body>
    </html>
  );
}
