import { isTrackingExcludedPath } from "@/lib/tracking-tags/paths";

/** Version de l'API Graph (https://developers.facebook.com/docs/graph-api/changelog) à revoir lors d'une montée de version. */
export const META_GRAPH_VERSION = "v26.0";

export type MetaServerEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: "website";
  user_data: { client_ip_address?: string; client_user_agent?: string; fbp?: string; fbc?: string };
};

const FBP = /^fb\.\d\.\d{10,13}\.\d{1,20}$/;
const FBC = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,200}$/;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|preview/i;

/** Les robots (indexation, aperçus de lien, tests de performance) ne sont pas des visiteurs : aucun événement. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT.test(userAgent);
}

/** Adresse de la page, construite depuis l'origine du site (jamais depuis l'hôte envoyé par le navigateur). */
export function pageUrl(origin: string, path: string): string | null {
  if (isTrackingExcludedPath(path)) return null;
  try {
    const url = new URL(path, origin);
    return url.origin === new URL(origin).origin ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Événement « PageView » serveur : fbp/fbc ne sont repris que s'ils ont le format attendu ; ip et user-agent en clair (exigé par Meta). */
export function buildPageViewEvent(input: {
  eventId: string;
  url: string;
  ip: string | null;
  userAgent: string | null;
  fbp?: string | null;
  fbc?: string | null;
  nowMs?: number;
}): MetaServerEvent {
  const userData: MetaServerEvent["user_data"] = {};
  if (input.ip && input.ip !== "unknown") userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent.slice(0, 500);
  if (input.fbp && FBP.test(input.fbp)) userData.fbp = input.fbp;
  if (input.fbc && FBC.test(input.fbc)) userData.fbc = input.fbc;
  return {
    event_name: "PageView",
    event_time: Math.floor((input.nowMs ?? Date.now()) / 1000),
    event_id: input.eventId,
    event_source_url: input.url,
    action_source: "website",
    user_data: userData,
  };
}
