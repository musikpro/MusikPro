"use client";
import Icon from "./Icon";
export default function SearchField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="demo-search-field flex-1">
      <span className="demo-search-icon" aria-hidden="true">
        <Icon i="search" size={17} />
      </span>
      <label className="demo-search-content">
        <span>Rechercher</span>
        <input
          type="search"
          aria-label={label}
          className="demo-field"
          placeholder="Titre, style ou occasion…"
          maxLength={200}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {value && (
        <button
          type="button"
          data-demo-ready="true"
          aria-label="Effacer la recherche"
          onClick={() => onChange("")}
          className="demo-search-clear"
        >
          <Icon i="x" size={16} />
        </button>
      )}
    </div>
  );
}
