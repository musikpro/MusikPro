import { describe, expect, it } from "vitest";
import { parseTrackingCode, trackingCodeError } from "@/lib/tracking-tags/parse";
import { trackingTagOrderSchema } from "@/lib/validation/tracking-tags";

describe("parseTrackingCode", () => {
  it("accepte la balise de vérification de domaine Facebook", () => {
    const nodes = parseTrackingCode(
      '<meta name="facebook-domain-verification" content="upnuqnh9kknzqdca1yvceh6pb33t2u" />',
    );
    expect(nodes).toEqual([
      { kind: "meta", attrs: { name: "facebook-domain-verification", content: "upnuqnh9kknzqdca1yvceh6pb33t2u" } },
    ]);
  });

  it("accepte un pixel Facebook (script inline + noscript img)", () => {
    const nodes = parseTrackingCode(`<!-- Meta Pixel -->
<script>!function(f,b,e,v){f.fbq=1}(window,document);fbq('init','123');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=123&ev=PageView&noscript=1" /></noscript>`);
    expect(nodes.map((n) => n.kind)).toEqual(["script", "pixel"]);
    expect(nodes[1]).toMatchObject({ kind: "pixel", src: "https://www.facebook.com/tr?id=123&ev=PageView&noscript=1" });
  });

  it("accepte un script externe d'un domaine autorisé", () => {
    expect(parseTrackingCode('<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>')).toEqual([
      { kind: "script", src: "https://www.googletagmanager.com/gtag/js?id=G-1", inline: null },
    ]);
  });

  it.each([
    ["script hors domaines autorisés", '<script src="https://evil.example/x.js"></script>'],
    ["script http", '<script src="http://connect.facebook.net/x.js"></script>'],
    ["balise inconnue", '<div onclick="x()">salut</div>'],
    ["meta refresh", '<meta http-equiv="refresh" content="0;url=https://evil.example" />'],
    ["gestionnaire on* sur meta", '<meta name="a" content="b" onload="x()" />'],
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["noscript sans img", "<noscript><script>x()</script></noscript>"],
    ["texte brut", "bonjour"],
    ["vide", "   "],
    ["script non fermé", "<script>alert(1)"],
    ["type module", '<script type="module">x()</script>'],
  ])("refuse : %s", (_label, code) => {
    expect(trackingCodeError(code)).not.toBeNull();
  });
});

describe("trackingTagOrderSchema", () => {
  it("accepte une liste JSON d'identifiants uniques", () => {
    expect(trackingTagOrderSchema.parse({ order: JSON.stringify(["a", "b"]) }).order).toEqual(["a", "b"]);
  });
  it.each([["pas du json"], ["[]"], ['["a","a"]'], ["[1]"]])("refuse %s", (order) => {
    expect(trackingTagOrderSchema.safeParse({ order }).success).toBe(false);
  });
});
