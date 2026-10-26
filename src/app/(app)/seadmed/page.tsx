import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/PlaceholderNotice";
import { requireSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Seadmed",
};

export default async function SeadmedPage() {
  await requireSession();

  return (
    <section aria-labelledby="seadmed-pealkiri" className="space-y-4">
      <header className="space-y-1">
        <h1 id="seadmed-pealkiri" className="text-2xl font-semibold text-slate-900">
          Seadmed
        </h1>
        <p className="text-sm text-slate-600">
          Sularahaautomaatide otsing ja tööde ajalugu.
        </p>
      </header>
      <PlaceholderNotice>
        See vaade on arendamisel. Seadmete otsing ja hooldusajalugu lisatakse
        pärast andmebaasiühenduse seadistamist.
      </PlaceholderNotice>
    </section>
  );
}
