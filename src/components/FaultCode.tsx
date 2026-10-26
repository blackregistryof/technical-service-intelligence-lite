import type { CodeRef } from "@/lib/domain/types";

export function FaultCode({ code }: { code: CodeRef | null }) {
  if (!code) return <span className="italic text-slate-500">Puudub</span>;
  return (
    <>
      <span className="font-mono">{code.code}</span>
      {code.description ? <span> – {code.description}</span> : null}
    </>
  );
}
