import { requireUser } from "@/lib/auth/session";
import UserDashboardMobile from "@/components/banani/UserDashboardMobile";
import UserDashboardDesktop from "@/components/banani/UserDashboardDesktop";
import Preview from "@/components/banani/Preview";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./banani.css";
export default async function Page() {
  await requireUser();
  return (
    <Preview>
      <div className="banani-mobile">
        <UserDashboardMobile />
      </div>
      <div className="banani-desktop">
        <UserDashboardDesktop />
      </div>
    </Preview>
  );
}
