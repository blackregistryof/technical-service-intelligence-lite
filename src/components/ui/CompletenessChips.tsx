import { CheckIcon, MissingIcon } from "@/components/ui/icons";
import type { CompletenessItem } from "@/lib/domain/completeness";
import { COMPLETENESS_LABELS, COMPLETENESS_STATE_LABELS } from "@/lib/format";

const STATE_STYLES = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-900",
  missing: "border-dashed border-slate-400 bg-white text-slate-700",
  notApplicable: "border-slate-200 bg-slate-50 text-slate-500",
} as const;

/** Registered/missing information for one work order, each with text, not colour alone. */
export function CompletenessChips({ items }: { items: CompletenessItem[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Registreeritud ja puuduv info">
      {items.map(({ key, state }) => (
        <li
          key={key}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${STATE_STYLES[state]}`}
        >
          {state === "present" ? (
            <CheckIcon className="h-3 w-3" />
          ) : (
            <MissingIcon className="h-3 w-3" />
          )}
          <span>{COMPLETENESS_LABELS[key]}</span>
          <span className={state === "present" ? "sr-only" : ""}>
            {state === "present" ? `: ${COMPLETENESS_STATE_LABELS[state]}` : `– ${COMPLETENESS_STATE_LABELS[state]}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
