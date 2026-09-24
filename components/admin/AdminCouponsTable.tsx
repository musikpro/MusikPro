"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";
import { deleteCoupon, toggleCoupon } from "@/app/admin/coupons/actions";
import AdminDeleteCouponButton from "./AdminDeleteCouponButton";

export type AdminCouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string;
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
};

function formatValue(row: AdminCouponRow) {
  return row.type === "percent" ? `-${row.value}%` : `-${row.value.toLocaleString("fr-FR")} XOF`;
}

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

export default function AdminCouponsTable({ rows }: { rows: AdminCouponRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    if (!needle) return rows;
    return rows.filter((row) => `${row.code} ${row.description}`.toLocaleLowerCase("fr").includes(needle));
  }, [query, rows]);

  return (
    <section className="admin-panel admin-table-panel admin-coupons-panel">
      <div className="admin-catalog-toolbar admin-table-toolbar">
        <label className="admin-search-field">
          <Icon i="search" size={17} />
          <span className="sr-only">Rechercher un code promo</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code ou description…" />
          {query ? (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}>
              <Icon i="x" size={15} />
            </button>
          ) : null}
        </label>
      </div>
      <div className="admin-data-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Réduction</th>
              <th>Utilisation</th>
              <th>Expire le</th>
              <th>État</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const expired = isExpired(row.expiresAt);
              return (
                <tr key={row.id}>
                  <td className="admin-table-primary" data-label="Code">
                    <strong>{row.code}</strong>
                    {row.description ? <small>{row.description}</small> : null}
                  </td>
                  <td data-label="Réduction">{formatValue(row)}</td>
                  <td data-label="Utilisation">
                    {row.redemptionCount}
                    {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ""}
                  </td>
                  <td data-label="Expire le">
                    {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("fr-FR") : "Jamais"}
                  </td>
                  <td data-label="État">
                    <span className={`admin-status ${!row.active ? "is-pending" : expired ? "is-danger" : "is-success"}`}>
                      {!row.active ? "Désactivé" : expired ? "Expiré" : "Actif"}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="admin-table-actions">
                      <Link className="admin-secondary-action admin-style-edit" href={`/admin/coupons/${row.id}`}>
                        <Icon i="pencil" size={15} /> Modifier
                      </Link>
                      <form action={toggleCoupon}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="active" value={String(row.active)} />
                        <button className="admin-secondary-action" type="submit">
                          <Icon i={row.active ? "pause" : "play"} size={15} />
                          {row.active ? "Désactiver" : "Activer"}
                        </button>
                      </form>
                      <form action={deleteCoupon}>
                        <input type="hidden" name="id" value={row.id} />
                        <AdminDeleteCouponButton code={row.code} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!filtered.length ? (
        <div className="admin-empty-state">
          <Icon i="search-x" size={22} />
          <strong>Aucun code trouvé</strong>
          <p>Modifie la recherche.</p>
        </div>
      ) : null}
    </section>
  );
}
