import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-900">Lehte ei leitud</h1>
      <p className="text-sm text-slate-600">
        Otsitud lehte ei ole olemas või see on teisaldatud.
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
