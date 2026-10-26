export function PlaceholderNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600"
    >
      {children}
    </div>
  );
}
