import Screen from "@/components/banani/SongCreationGenreSelection";
import Preview from "@/components/banani/Preview";
import { isDemoRequest } from "@/lib/auth/session";
import { getActiveMusicStyles } from "@/lib/music-styles/server";

export default async function Page() {
  const genres = await getActiveMusicStyles({ demo: await isDemoRequest() });
  return (
    <Preview>
      <div className="banani-screen banani-genre-screen">
        <Screen genres={genres} />
      </div>
    </Preview>
  );
}
