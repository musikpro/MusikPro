import Screen from "@/components/banani/DiscoverLibraryScreen";
import GuestDiscover from "@/components/banani/GuestDiscover";
import Preview from "@/components/banani/Preview";
import { isGuestRequest } from "@/lib/auth/session";
import { listDiscoverSongs } from "@/lib/discover/server";

export default async function Page() {
  // Visiteur sans compte (lien invité) : bibliothèque partagée à l'écoute, sans donnée de compte (aucune chanson « à moi »).
  if (await isGuestRequest()) {
    return (
      <Preview>
        <GuestDiscover songs={await listDiscoverSongs(null)} />
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
