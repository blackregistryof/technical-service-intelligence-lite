import Link from "next/link";
import { MAX_QUERY_LENGTH } from "@/lib/domain/analysis";

// Plain GET form: works without JavaScript and keeps the query in the URL.
export function SearchForm({
  action,
  label,
  placeholder,
  defaultValue,
  hiddenFields = {},
  clearHref = action,
}: {
  action: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  /** Other active filters to keep when searching (e.g. the status filter). */
  hiddenFields?: Record<string, string>;
  /** Target of "Tühjenda"; defaults to the unfiltered action URL. */
  clearHref?: string;
}) {
  return (
    <form action={action} method="get" role="search" className="space-y-1">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="otsing" className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="otsing"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={MAX_QUERY_LENGTH}
          className="block w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-600 focus:outline-2 focus:outline-blue-600 sm:max-w-md sm:flex-1"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Otsi
          </button>
          {defaultValue ? (
            <Link
              href={clearHref}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Tühjenda
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
