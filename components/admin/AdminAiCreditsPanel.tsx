"use client";

import { useActionState } from "react";
import Link from "next/link";
import Icon from "@/components/banani/Icon";
import { AdminMetric } from "@/components/admin/AdminPage";
import AdminDailyBarChart from "@/components/admin/AdminDailyBarChart";
import AdminSecretField from "@/components/admin/AdminSecretField";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import {
  removeAnthropicAdminKey,
  saveAnthropicAdminKey,
  type AiCreditsActionState,
} from "@/app/admin/ai-credits/actions";

type MusicfulInfo = {
  configured: boolean;
  credits: string | null;
  lastTestedAt: Date | string | null;
};

type AnthropicSpend = {
  amountUsd: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dailySpend: { day: string; amountUsd: number }[];
};

type AnthropicInfo = {
  configured: boolean;
  last4: string | null;
  spend: AnthropicSpend | null;
  spendError: string | null;
};

function formatUsd(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function AdminAiCreditsPanel({
  musicful,
  anthropic,
}: {
  musicful: MusicfulInfo;
  anthropic: AnthropicInfo;
}) {
  const [saveState, saveAction, savePending] = useActionState<AiCreditsActionState, FormData>(
    saveAnthropicAdminKey,
    null,
  );
  useAdminActionToast(saveState);
  const [removeState, removeAction, removePending] = useActionState<AiCreditsActionState, FormData>(
    removeAnthropicAdminKey,
    null,
  );
  useAdminActionToast(removeState);

  return (
    <div className="admin-insight-grid">
      <article className="admin-panel admin-insight-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="music-2" size={18} />
            </span>
            <div>
              <h2>Musicful</h2>
              <p>Solde tel que récupéré lors du dernier test de connexion.</p>
            </div>
          </div>
        </div>
        {musicful.configured ? (
          <>
            <AdminMetric
              icon="coins"
              value={musicful.credits ?? "—"}
              label="Crédits/droits restants"
              note={
                musicful.lastTestedAt
                  ? `Dernier test : ${new Date(musicful.lastTestedAt).toLocaleString("fr-FR")}`
                  : "Aucun test de connexion effectué pour le moment."
              }
              tone="primary"
            />
            <p className="admin-panel-footnote">
              Musicful n’expose pas de consommation totale historique via son API — seul le solde restant est
              disponible.
            </p>
          </>
        ) : (
          <p>Aucune clé Musicful configurée pour le moment.</p>
        )}
        <div className="admin-editor-actions">
          <Link className="admin-secondary-action" href="/admin/ai-providers/audio">
            <Icon i="activity" size={15} />
            {musicful.configured ? "Rafraîchir (tester la connexion)" : "Configurer Musicful"}
          </Link>
        </div>
      </article>

      <article className="admin-panel admin-insight-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="credit-card" size={18} />
            </span>
            <div>
              <h2>Claude / Anthropic</h2>
              <p>
                Dépenses du mois en cours via l’API Coût Anthropic. Le solde restant de l’organisation n’est pas
                exposé par l’API Anthropic — consulte console.anthropic.com pour ce chiffre.
              </p>
            </div>
          </div>
        </div>

        {!anthropic.configured ? (
          <form action={saveAction} className="admin-editor-grid">
            <label className="admin-editor-field is-wide">
              <span className="admin-field-label">
                <span>Admin API Key Anthropic</span>
              </span>
              <AdminSecretField name="adminApiKey" configured={false} placeholder="sk-ant-admin01-…" />
              <small>
                Clé distincte de celle utilisée pour générer les paroles — crée-la dans console.anthropic.com → Settings
                → Admin API Keys. Elle est chiffrée comme les autres clés API et sert uniquement à lire les dépenses,
                jamais à générer du contenu.
              </small>
            </label>
            <div className="admin-editor-actions is-wide">
              <button type="submit" disabled={savePending}>
                <Icon i="save" size={17} />
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          <>
            {anthropic.spend ? (
              <>
                <AdminMetric
                  icon="credit-card"
                  value={formatUsd(anthropic.spend.amountUsd, anthropic.spend.currency)}
                  label="Dépenses ce mois-ci"
                  note={`Période : ${new Date(anthropic.spend.periodStart).toLocaleDateString("fr-FR")} – ${new Date(anthropic.spend.periodEnd).toLocaleDateString("fr-FR")}`}
                  tone="primary"
                />
                <AdminDailyBarChart
                  title="Dépenses quotidiennes"
                  total={formatUsd(anthropic.spend.amountUsd, anthropic.spend.currency)}
                  points={anthropic.spend.dailySpend.map((point) => ({ day: point.day, value: point.amountUsd }))}
                />
              </>
            ) : anthropic.spendError ? (
              <p>{anthropic.spendError}</p>
            ) : (
              <p>Chargement des dépenses…</p>
            )}
            <div className="admin-editor-actions">
              <span className="admin-status is-success">Admin API Key ••••{anthropic.last4}</span>
              <form action={removeAction}>
                <button type="submit" className="is-danger" disabled={removePending}>
                  <Icon i="trash-2" size={15} />
                  Supprimer la clé
                </button>
              </form>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
