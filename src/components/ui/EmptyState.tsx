/** Neutral empty-state block for lists and panels without records. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600"
    >
      <p className="font-medium text-slate-800">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
