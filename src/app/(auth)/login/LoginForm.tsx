"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const errorId = "parool-viga";

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="parool" className="block text-sm font-medium text-slate-800">
          Parool
        </label>
        <input
          id="parool"
          name="password"
          type="password"
          required
          autoComplete="off"
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-blue-600 focus:outline-2 focus:outline-blue-600 aria-invalid:border-red-600"
        />
        {state.error ? (
          <p id={errorId} role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sisenen…" : "Logi sisse"}
      </button>
    </form>
  );
}
