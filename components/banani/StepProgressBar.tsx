const t = (text: string) => text;
export const displayName = "Step Progress Bar";
export const shortDescription = "Step indicator for song creation flow";

export default function StepProgressBar({ current = 2, total = 7 }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 ${i < current ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}
