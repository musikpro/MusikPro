"use client";

import Link from "next/link";

import { useDemo } from "./DemoProvider";
import Icon from "./Icon";

export default function WorkspaceBalanceCard() {
  const demo = useDemo();
  const hasSongs = demo.balance > 0;

  return (
    <section className="workspace-context-card workspace-credit-card">
      <div className="workspace-credit-heading">
        <span aria-hidden="true">
          <Icon i="music-2" size={18} />
        </span>
        <div>
          <small>Votre solde</small>
          <h2>Chansons disponibles</h2>
        </div>
      </div>
      <div className="workspace-credit-balance">
        <strong className="workspace-credit-number">{demo.balance}</strong>
        <span>chansons restantes</span>
      </div>
      <p className="workspace-credit-demo">
        <Icon i={hasSongs ? "check" : "info"} size={14} />
        {hasSongs
          ? `Prêt pour ${demo.balance} nouvelle${demo.balance > 1 ? "s" : ""} création${demo.balance > 1 ? "s" : ""}`
          : "Choisissez un pack pour créer votre première chanson"}
      </p>
      <Link href={demo.href("/dashboard/credits")} className="workspace-primary-link">
        Voir les packs
        <Icon i="arrow-right" size={16} />
      </Link>
    </section>
  );
}
