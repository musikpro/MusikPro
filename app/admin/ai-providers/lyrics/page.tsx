import { inArray } from "drizzle-orm";
import AdminCatalogPage from "@/components/admin/AdminCatalogPage";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLyricsProviderPage() {
  await requireAdmin();
  const rows = await getServiceDb().select().from(aiProviderConfigs).where(inArray(aiProviderConfigs.provider, ["openai", "anthropic"]));
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const openai = byProvider.get("openai");
  const anthropic = byProvider.get("anthropic");
  return <AdminCatalogPage eyebrow="Génération des paroles" title="Choisir une entreprise IA" description="Configure OpenAI ou Claude, puis sélectionne le fournisseur utilisé par MusikPro." searchLabel="Rechercher un fournisseur" sourceNote="Un seul fournisseur est utilisé pour les paroles à la fois. Les clés sont chiffrées et restent exclusivement côté serveur." items={[
    { id: "openai", title: "OpenAI / ChatGPT", subtitle: "Génération, révision et rallongement via OpenAI", meta: openai ? `${openai.defaultModel}${openai.isDefaultForLyrics ? " · Utilisé actuellement" : ""}` : "À configurer", status: openai?.enabled ? "active" : "inactive", icon: "bot", href: "/admin/ai-providers/lyrics/openai" },
    { id: "anthropic", title: "Claude / Anthropic", subtitle: "Génération, révision et rallongement via Claude", meta: anthropic ? `${anthropic.defaultModel}${anthropic.isDefaultForLyrics ? " · Utilisé actuellement" : ""}` : "À configurer", status: anthropic?.enabled ? "active" : "inactive", icon: "brain", href: "/admin/ai-providers/lyrics/anthropic" },
  ]} />;
}
