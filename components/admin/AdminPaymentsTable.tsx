"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";

export type AdminPaymentRow = {
  id: string;
  reference: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  country: string | null;
  createdAt: string;
};

export default function AdminPaymentsTable({ rows }: { rows: AdminPaymentRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return rows.filter(
      (row) =>
        (status === "all" || row.status === status) &&
        (!needle ||
          `${row.reference} ${row.provider} ${row.method ?? ""} ${row.country ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(needle)),
    );
  }, [query, rows, status]);
  return (
    <section className="admin-panel admin-table-panel">
      <div className="admin-catalog-toolbar admin-table-toolbar">
        <label className="admin-search-field">
          <Icon i="search" size={17} />
          <span className="sr-only">Rechercher un paiement</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Référence, moyen ou pays…"
          />
          {query ? (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}>
              <Icon i="x" size={15} />
            </button>
          ) : null}
        </label>
        <div className="admin-filter-tabs">
          {[
            ["all", "Tous"],
            ["paid", "Complétés"],
            ["pending", "En attente"],
            ["failed", "Échoués"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? "is-active" : undefined}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-data-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Provider</th>
              <th>Moyen</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td data-label="Date">{new Date(row.createdAt).toLocaleString("fr-FR")}</td>
                <td className="admin-table-primary" data-label="Référence">
                  <strong>{row.reference}</strong>
                  <small>{row.country ?? "Pays non renseigné"}</small>
                </td>
                <td data-label="Provider">{row.provider}</td>
                <td data-label="Moyen">{row.method ?? "—"}</td>
                <td data-label="Montant">
                  <strong>
                    {row.amount.toLocaleString("fr-FR")} {row.currency}
                  </strong>
                </td>
                <td data-label="Statut">
                  <span
                    className={`admin-status ${row.status === "paid" ? "is-success" : row.status === "failed" ? "is-danger" : "is-pending"}`}
                  >
                    {row.status === "paid" ? "Complété" : row.status === "failed" ? "Échoué" : "En attente"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length ? (
        <div className="admin-empty-state">
          <Icon i="receipt-text" size={22} />
          <strong>Aucun paiement trouvé</strong>
          <p>Modifie la recherche ou le statut.</p>
        </div>
      ) : null}
    </section>
  );
}
