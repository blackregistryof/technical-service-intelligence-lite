import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/PlaceholderNotice";
import { requireSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Rikketeated",
};

export default async function RikketeatedPage() {
  await requireSession();

  return (
    <section aria-labelledby="rikketeated-pealkiri" className="space-y-4">
      <header className="space-y-1">
        <h1
          id="rikketeated-pealkiri"
          className="text-2xl font-semibold text-slate-900"
        >
          Rikketeated
        </h1>
        <p className="text-sm text-slate-600">
          Avatud ja ootel olevad rikketööd, uusimad eespool.
        </p>
      </header>
      <PlaceholderNotice>
        See vaade on arendamisel. Rikketeadete nimekiri ja otsing lisatakse
        pärast andmebaasiühenduse seadistamist.
      </PlaceholderNotice>
    </section>
  );
}
