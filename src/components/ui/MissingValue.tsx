import { MissingIcon } from "@/components/ui/icons";

/**
 * Standard marker for a value that is absent in the source data. Use it
 * instead of placeholders so that missing information is never disguised.
 */
export function MissingValue({ children = "Puudub" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-xs italic text-slate-600">
      <MissingIcon className="h-3 w-3" />
      {children}
    </span>
  );
}
