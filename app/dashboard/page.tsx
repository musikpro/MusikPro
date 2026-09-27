import { requireUser } from "@/lib/auth/session";
import UserDashboardMobile from "@/components/banani/UserDashboardMobile";
import UserDashboardDesktop from "@/components/banani/UserDashboardDesktop";
import { AmbientPlayerProvider } from "@/components/banani/AmbientPlayerContext";
import Preview from "@/components/banani/Preview";
import { getAmbientTrackStatus } from "@/lib/settings/ambient-track";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./banani.css";
export default async function Page() {
  await requireUser();
  const ambient = await getAmbientTrackStatus();
  return (
    <Preview>
      <AmbientPlayerProvider status={ambient}>
        <div className="banani-mobile">
          <UserDashboardMobile />
        </div>
        <div className="banani-desktop">
          <UserDashboardDesktop />
        </div>
      </AmbientPlayerProvider>
    </Preview>
  );
}
