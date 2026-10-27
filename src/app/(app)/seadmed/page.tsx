import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { getServiceRepository } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Seadmed",
};

export default async function SeadmedPage(props: PageProps<"/seadmed">) {
  const repository = await getServiceRepository();
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const atms = await repository.searchAtms(query);

  return (
    <section aria-labelledby="seadmed-pealkiri" className="mx-auto w-full max-w-[68rem] space-y-5">
      <header className="space-y-1">
        <h1 id="seadmed-pealkiri" className="text-2xl font-semibold text-slate-900">
          Seadmed
        </h1>
        <p className="text-sm text-slate-600">
          Otsi sularahaautomaati ja ava selle rikketeadete ning hooldustööde ajalugu.
        </p>
      </header>

      <SearchForm
        action="/seadmed"
        label="Otsi automaadi numbri järgi"
        placeholder="nt ATM-0101 või 0101"
        defaultValue={query}
      />

      <p className="text-sm text-slate-700" aria-live="polite">
        {query
          ? `Otsingule „${query}“ vastab ${atms.length} automaati.`
          : `Automaate kokku: ${atms.length}.`}
      </p>

      {atms.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Otsingule vastavaid automaate ei leitud.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {atms.map((atm) => (
            <li key={atm.id}>
              <Link
                href={`/seadmed/${atm.atmNumber}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span className="block text-base font-semibold text-blue-800">
                  {atm.atmNumber}
                </span>
                <span className="block text-sm text-slate-700">Mudel: {atm.model}</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Avatud või ootel rikketeateid: {atm.activeFaultCallCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
