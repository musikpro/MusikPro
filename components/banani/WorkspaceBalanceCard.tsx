"use client";

import Link from "next/link";

import { useDemo } from "./DemoProvider";
import Icon from "./Icon";
import { CREDITS_PER_GENERATION, getGenerationCount } from "@/lib/credit-plans/catalog";

export default function WorkspaceBalanceCard() {
  const demo = useDemo();
  const canGenerate = demo.balance >= CREDITS_PER_GENERATION;

  return (
    <section className="workspace-context-card workspace-credit-card">
      <div className="workspace-credit-heading">
        <span aria-hidden="true">
          <Icon i="music-2" size={18} />
        </span>
        <div>
          <small>Votre solde</small>
          <h2>Crédits disponibles</h2>
        </div>
      </div>
      <div className="workspace-credit-balance">
        <strong className="workspace-credit-number">{demo.balance}</strong>
        <span>crédits restants</span>
      </div>
      <p className="workspace-credit-demo">
        <Icon i={canGenerate ? "check" : "info"} size={14} />
        {canGenerate
          ? `${getGenerationCount(demo.balance)} génération${getGenerationCount(demo.balance) > 1 ? "s" : ""} disponible${getGenerationCount(demo.balance) > 1 ? "s" : ""}`
          : "Ajoutez des crédits pour lancer une génération"}
      </p>
      <Link href={demo.href("/dashboard/credits")} className="workspace-primary-link">
        Voir les crédits
        <Icon i="arrow-right" size={16} />
      </Link>
    </section>
  );
}
