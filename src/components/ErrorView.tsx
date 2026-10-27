"use client";

import { focusRing } from "@/components/ui/styles";

// Generic error view. Error details are logged on the server, not shown here.
export function ErrorView({ retry }: { retry: () => void }) {
  return (
    <section role="alert" className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-900">Andmete laadimine ebaõnnestus</h1>
      <p className="text-sm text-slate-600">
        Andmeid ei õnnestunud praegu kuvada. Proovi uuesti või teavita probleemi püsimisel
        rakenduse haldajat.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className={`rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 ${focusRing}`}
      >
        Proovi uuesti
      </button>
    </section>
  );
}
