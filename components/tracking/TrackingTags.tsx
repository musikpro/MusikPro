import Script from "next/script";
import { headers } from "next/headers";
import { getActiveTrackingNodes } from "@/lib/tracking-tags/server";

/**
 * Insère les balises de suivi/publicité configurées dans /admin/tracking-tags pour la zone demandée. Les `<meta name>`
 * passent par generateMetadata (getTrackingMetaOther) pour figurer dans le <head> initial ; les autres `<meta>` et les
 * `<link>` sont remontés dans le <head> par React. Les scripts sont chargés en `lazyOnload` (après le chargement
 * complet de la page, sans la ralentir) et reçoivent le nonce CSP de la requête. Le contenu est reconstruit à partir de
 * nœuds validés (lib/tracking-tags/parse.ts), jamais injecté en HTML brut.
 */
export default async function TrackingTags({ scope }: { scope: "landing" | "dashboard" }) {
  const tags = await getActiveTrackingNodes(scope);
  if (!tags.length) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      {tags.flatMap(({ id, nodes }) =>
        nodes.map((node, index) => {
          const key = `${id}-${index}`;
          // Les <meta name> passent par l'API metadata (voir getTrackingMetaOther) pour figurer dans le <head> initial.
          if (node.kind === "meta") return node.attrs.name ? null : <meta key={key} {...node.attrs} />;
          if (node.kind === "link") {
            const { crossorigin, ...rest } = node.attrs;
            return <link key={key} {...rest} crossOrigin={crossorigin === undefined ? undefined : "anonymous"} />;
          }
          if (node.kind === "script") {
            return node.src ? (
              <Script key={key} id={`tracking-${key}`} src={node.src} strategy="lazyOnload" nonce={nonce} />
            ) : (
              <Script key={key} id={`tracking-${key}`} strategy="lazyOnload" nonce={nonce}>
                {node.inline}
              </Script>
            );
          }
          return (
            <noscript key={key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- pixel de suivi 1×1 */}
              <img
                src={node.src}
                width={node.width ?? 1}
                height={node.height ?? 1}
                alt=""
                style={{ display: "none" }}
              />
            </noscript>
          );
        }),
      )}
    </>
  );
}
