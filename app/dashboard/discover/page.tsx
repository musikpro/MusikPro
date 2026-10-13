import Screen from "@/components/banani/DiscoverLibraryScreen";
import GuestDiscover from "@/components/banani/GuestDiscover";
import Preview from "@/components/banani/Preview";
import { isGuestRequest } from "@/lib/auth/session";
import { randomInt } from "node:crypto";
import { listDiscoverSongs } from "@/lib/discover/server";

const GUEST_PLAYLIST_SIZE = 20;

/** Tirage aléatoire (Fisher-Yates) de 20 chansons : une sélection différente à chaque chargement de la page. */
function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export default async function Page() {
  // Visiteur sans compte (lien invité) : bibliothèque partagée à l'écoute, sans donnée de compte (aucune chanson « à moi »).
  if (await isGuestRequest()) {
    return (
      <Preview>
        <GuestDiscover songs={pickRandom(await listDiscoverSongs(null), GUEST_PLAYLIST_SIZE)} />
      </Preview>
    );
  }
  return (
    <Preview>
      <div className="banani-screen ">
        <Screen />
      </div>
    </Preview>
  );
}
