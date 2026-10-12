import "./vinyl-disc.css";

type VinylDiscProps = {
  /** Pochette de la chanson, affichée dans l'étiquette centrale du disque. */
  coverUrl?: string | null;
  /** Le disque tourne tant que c'est vrai (lecteur du dashboard). La page de partage pilote la rotation en CSS. */
  playing?: boolean;
  className?: string;
};

const GROOVES = [88, 82, 76, 70, 64, 58, 52, 46];

/**
 * Disque vinyle pour le lecteur : sillons, étiquette blanche avec la pochette au milieu et bras de lecture fixe.
 * Seul le disque tourne (animation CSS en pause par défaut) ; `prefers-reduced-motion` désactive la rotation.
 */
export default function VinylDisc({ coverUrl, playing = false, className = "" }: VinylDiscProps) {
  return (
    <div className={`vinyl-disc ${playing ? "is-playing" : ""} ${className}`} aria-hidden="true">
      <div className="vinyl-rotor">
        <svg viewBox="0 0 200 200" className="vinyl-svg" focusable="false">
          <circle cx="100" cy="100" r="96" fill="#0d0d0f" />
          {GROOVES.map((radius, index) => {
            const circumference = 2 * Math.PI * radius;
            // Arcs clairs répartis sur deux quadrants opposés, comme les reflets d'un vrai vinyle.
            const arc = circumference * (0.2 + (index % 3) * 0.04);
            return (
              <g key={radius}>
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.85"
                  strokeWidth="1.1"
                  strokeDasharray={`${arc} ${circumference - arc}`}
                  transform={`rotate(${-70 + index * 6} 100 100)`}
                />
                <circle
                  cx="100"
                  cy="100"
                  r={radius - 3}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.55"
                  strokeWidth="0.9"
                  strokeDasharray={`${arc * 0.9} ${circumference - arc * 0.9}`}
                  transform={`rotate(${110 + index * 5} 100 100)`}
                />
              </g>
            );
          })}
          <circle cx="100" cy="100" r="35" fill="#ffffff" />
          <circle cx="100" cy="100" r="35" fill="none" stroke="#0d0d0f" strokeWidth="1.2" />
        </svg>
        <div className="vinyl-label">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl || "/icon.svg"} alt="" decoding="async" />
          <span className="vinyl-spindle" />
        </div>
      </div>
      <svg viewBox="0 0 200 200" className="vinyl-tonearm" focusable="false">
        <circle cx="178" cy="24" r="16" fill="#0d0d0f" />
        <path
          d="M178 24 L150 118 L112 160"
          fill="none"
          stroke="#0d0d0f"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M178 24 L150 118 L112 160"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="96"
          y="150"
          width="30"
          height="16"
          rx="5"
          transform="rotate(-42 111 158)"
          fill="#ffffff"
          stroke="#0d0d0f"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
}
