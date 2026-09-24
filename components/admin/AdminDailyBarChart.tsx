const BAR_GAP = 2;
const BAR_HEIGHT = 56;

export default function AdminDailyBarChart({
  title,
  points,
  total,
  tone = "primary",
}: {
  title: string;
  points: { day: string; value: number }[];
  total: string;
  tone?: "primary" | "success";
}) {
  const max = Math.max(...points.map((point) => point.value), 0);
  const barWidth = 10;
  const width = points.length * (barWidth + BAR_GAP);
  const firstLabel = points[0]?.day ? formatShortDate(points[0].day) : "";
  const lastLabel = points[points.length - 1]?.day ? formatShortDate(points[points.length - 1].day) : "";

  return (
    <div className="admin-bar-chart">
      <div className="admin-bar-chart-heading">
        <span>{title}</span>
        <strong>{total}</strong>
      </div>
      {max > 0 ? (
        <svg
          className={`admin-bar-chart-svg is-${tone}`}
          viewBox={`0 0 ${width} ${BAR_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title} : ${total}`}
        >
          {points.map((point, index) => {
            const height = Math.max((point.value / max) * BAR_HEIGHT, point.value > 0 ? 2 : 0);
            return (
              <rect
                key={point.day}
                x={index * (barWidth + BAR_GAP)}
                y={BAR_HEIGHT - height}
                width={barWidth}
                height={height}
                rx={1.5}
              >
                <title>
                  {formatShortDate(point.day)} · {point.value.toLocaleString("fr-FR")}
                </title>
              </rect>
            );
          })}
        </svg>
      ) : (
        <p className="admin-bar-chart-empty">Aucune activité sur cette période.</p>
      )}
      <div className="admin-bar-chart-axis">
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}

function formatShortDate(isoDay: string) {
  const [, month, day] = isoDay.split("-");
  return `${day}/${month}`;
}
