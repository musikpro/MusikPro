"use client";

import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";

/** Copie le lien complet dans le presse-papiers et le confirme par le toast global. */
export default function AdminCopyLinkButton({ url }: { url: string }) {
  const showToast = useAdminToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: "Lien copié.", tone: "success" });
    } catch {
      showToast({ message: "Copie impossible : sélectionne le lien et copie-le à la main.", tone: "error" });
    }
  }
  return (
    <button type="button" className="admin-secondary-action" onClick={copy} aria-label={`Copier le lien ${url}`}>
      <Icon i="copy" size={15} /> Copier
    </button>
  );
}
