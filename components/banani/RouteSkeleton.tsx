import { Skeleton } from "@/components/ui/skeleton";
import Preview from "./Preview";
export default function RouteSkeleton({
  variant = "form",
}: {
  variant?: "form" | "songs" | "library" | "creation" | "profile";
}) {
  return (
    <Preview>
      <div
        className="banani-screen demo-route-skeleton"
        aria-busy="true"
        aria-label="Chargement de la page"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Skeleton width="100px" height="24px" />
          <Skeleton width="80px" height="24px" />
        </div>
        <div className="p-4">
          <Skeleton width="65%" height="32px" />
          <Skeleton
            width="80%"
            height="16px"
            style={{ marginTop: 8, marginBottom: 24 }}
          />
          {variant === "profile" && (
            <Skeleton
              width="80px"
              height="80px"
              style={{ borderRadius: "50%", margin: "16px auto" }}
            />
          )}
          <div
            className={
              variant === "creation" || variant === "library"
                ? "grid grid-cols-2 gap-3"
                : "flex flex-col gap-3"
            }
          >
            {Array.from(
              {
                length:
                  variant === "creation" ? 8 : variant === "library" ? 6 : 3,
              },
              (_, i) => (
                <Skeleton
                  key={i}
                  height={
                    variant === "songs"
                      ? "300px"
                      : variant === "library"
                        ? "220px"
                        : variant === "creation"
                          ? "100px"
                          : "64px"
                  }
                  style={{ borderRadius: 32 }}
                />
              ),
            )}
          </div>
          {variant === "form" && (
            <Skeleton
              height="128px"
              style={{ marginTop: 16, borderRadius: 20 }}
            />
          )}
          <Skeleton height="54px" style={{ marginTop: 24, borderRadius: 32 }} />
        </div>
        <span className="sr-only">Chargement…</span>
      </div>
    </Preview>
  );
}
