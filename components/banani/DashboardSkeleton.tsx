import { Skeleton } from "@/components/ui/skeleton";

function Content({ desktop = false }: { desktop?: boolean }) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {desktop && (
        <aside
          style={{
            width: 240,
            borderRight: "1px solid #E8E3DC",
            padding: 24,
            flexShrink: 0,
          }}
        >
          <Skeleton width="150px" height="32px" />
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} height="40px" style={{ marginTop: 12 }} />
          ))}
        </aside>
      )}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            height: 64,
            borderBottom: "1px solid #E8E3DC",
            padding: "12px 16px",
          }}
        >
          <Skeleton width="160px" height="32px" />
        </div>
        <div style={{ padding: desktop ? 32 : 16, display: "flex", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skeleton height="76px" style={{ borderRadius: 32, marginBottom: 24 }} />
            <Skeleton width="140px" height="24px" style={{ marginBottom: 16 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: desktop ? "repeat(2,minmax(0,1fr))" : "1fr",
                gap: 12,
              }}
            >
              {Array.from({ length: desktop ? 4 : 2 }, (_, i) => (
                <Skeleton key={i} height="92px" style={{ borderRadius: 20 }} />
              ))}
            </div>
            {!desktop && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                  gap: 10,
                  marginTop: 32,
                }}
              >
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} style={{ aspectRatio: "1", borderRadius: 32 }} />
                ))}
              </div>
            )}
            <Skeleton height="140px" style={{ marginTop: 32, borderRadius: 32 }} />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height="170px" style={{ marginTop: 16, borderRadius: 32 }} />
            ))}
          </div>
          {desktop && (
            <aside style={{ width: 320, flexShrink: 0 }}>
              <Skeleton height="260px" style={{ borderRadius: 32, marginBottom: 24 }} />
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} height="112px" style={{ borderRadius: 32, marginBottom: 12 }} />
              ))}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
export default function DashboardSkeleton() {
  return (
    <div className="banani-copy" aria-busy="true" aria-label="Chargement du dashboard">
      <div className="banani-mobile">
        <Content />
      </div>
      <div className="banani-desktop">
        <Content desktop />
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
