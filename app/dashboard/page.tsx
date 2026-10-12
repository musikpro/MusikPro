import { isGuestRequest, requireUser } from "@/lib/auth/session";
import GuestHome from "@/components/banani/GuestHome";
import UserDashboardMobile from "@/components/banani/UserDashboardMobile";
import UserDashboardDesktop from "@/components/banani/UserDashboardDesktop";
import { AmbientPlayerProvider } from "@/components/banani/AmbientPlayerContext";
import Preview from "@/components/banani/Preview";
import { getAmbientTrackStatus } from "@/lib/settings/ambient-track";
import { getTrendingSongs } from "@/lib/trending/server";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./banani.css";
export default async function Page() {
  await requireUser();
  const trending = await getTrendingSongs();
  // Visiteur sans compte (lien invité) : accueil allégé, sans aucune donnée de compte.
  if (await isGuestRequest()) {
    return (
      <Preview>
        <GuestHome trending={trending} />
      </Preview>
    );
  }
  const ambient = await getAmbientTrackStatus();
  return (
    <Preview>
      <AmbientPlayerProvider status={ambient}>
        <div className="banani-mobile">
          <UserDashboardMobile trending={trending} />
        </div>
        <div className="banani-desktop">
          <UserDashboardDesktop trending={trending} />
        </div>
      </AmbientPlayerProvider>
    </Preview>
  );
}
