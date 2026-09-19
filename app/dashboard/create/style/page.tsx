import Screen from "@/components/banani/StepStyleAndMood";
import Preview from "@/components/banani/Preview";
import { isDemoRequest } from "@/lib/auth/session";
import { getActiveMusicStyles } from "@/lib/music-styles/server";

export default async function Page() {
  const genres = await getActiveMusicStyles({ demo: await isDemoRequest() });
  return (
    <Preview>
      <div className="banani-screen ">
        <Screen genres={genres} />
      </div>
    </Preview>
  );
}
