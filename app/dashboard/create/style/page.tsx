import Screen from "@/components/banani/StepStyleAndMood";
import Preview from "@/components/banani/Preview";
import { isDemoRequest } from "@/lib/auth/session";
import { getActiveMusicStyles } from "@/lib/music-styles/server";
import { getVisibleMusicStyles } from "@/lib/settings/admin-display";

export default async function Page() {
  const [genres, visibleCount] = await Promise.all([
    isDemoRequest().then((demo) => getActiveMusicStyles({ demo })),
    getVisibleMusicStyles(),
  ]);
  return (
    <Preview>
      <div className="banani-screen ">
        <Screen genres={genres} visibleCount={visibleCount} />
      </div>
    </Preview>
  );
}
