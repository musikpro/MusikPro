const API = "https://www.googleapis.com/webmasters/v3";

export type SearchConsoleSite = { siteUrl: string; permissionLevel?: string };

export async function listSearchConsoleSites(accessToken: string): Promise<SearchConsoleSite[]> {
  const response = await fetch(`${API}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Search Console API error ${response.status}`);
  const body = (await response.json()) as { siteEntry?: SearchConsoleSite[] };
  return body.siteEntry ?? [];
}

export async function querySearchAnalytics(accessToken: string, siteUrl: string, body: Record<string, unknown>) {
  const response = await fetch(`${API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Search Console Analytics API error ${response.status}`);
  return response.json();
}
