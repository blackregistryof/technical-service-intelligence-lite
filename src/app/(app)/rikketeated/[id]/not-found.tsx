import Link from "next/link";

export default function FaultCallNotFound() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-900">Rikketeadet ei leitud</h1>
      <p className="text-sm text-slate-600">
        Sellise tunnusega rikketeadet ei ole olemas.
      </p>
      <Link
        href="/rikketeated"
        className="inline-block text-sm font-medium text-blue-700 underline hover:text-blue-900"
      >
        Tagasi rikketeadete juurde
      </Link>
    </section>
  );
}
