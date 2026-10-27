import Link from "next/link";

export default function AtmNotFound() {
  return (
    <section className="mx-auto w-full max-w-[68rem] space-y-3">
      <h1 className="text-2xl font-semibold text-slate-900">Automaati ei leitud</h1>
      <p className="text-sm text-slate-600">Sellise numbriga automaati ei ole olemas.</p>
      <Link
        href="/seadmed"
        className="inline-block text-sm font-medium text-blue-700 underline hover:text-blue-900"
      >
        Tagasi seadmete otsingusse
      </Link>
    </section>
  );
}
