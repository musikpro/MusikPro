import Screen from "@/components/banani/SongPlayerScreen";
import Preview from "@/components/banani/Preview";
export default function Page() {
  return (
    <Preview>
      <div className="banani-screen ">
        <Screen />
      </div>
    </Preview>
  );
}
