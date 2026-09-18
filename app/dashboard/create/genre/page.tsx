import Screen from "@/components/banani/SongCreationGenreSelection";
import Preview from "@/components/banani/Preview";
export default function Page() {
  return (
    <Preview>
      <div className="banani-screen banani-genre-screen">
        <Screen />
      </div>
    </Preview>
  );
}
