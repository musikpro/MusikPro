"use client";

import { useActionState } from "react";
import Icon from "@/components/banani/Icon";
import { testCountryIsConnectivity, type CountryIsTestResult } from "./actions";

export default function CountryIsTestButton() {
  const [result, formAction, isPending] = useActionState<CountryIsTestResult | null, FormData>(
    () => testCountryIsConnectivity(),
    null,
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
      <button className="admin-secondary-action" type="submit" disabled={isPending}>
        <Icon i="activity" size={15} />
        {isPending ? "Test en cours…" : "Tester country.is"}
      </button>
      {result ? (
        <span className={`admin-status ${result.ok ? "is-success" : "is-danger"}`}>
          {result.message} ({result.timeMs} ms)
        </span>
      ) : null}
    </form>
  );
}
