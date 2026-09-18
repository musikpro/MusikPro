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
    <div className="demo-search-field flex-1 flex items-center gap-2 bg-input border border-border rounded-lg px-3">
      <Icon i="search" size={16} className="text-muted-foreground" />
      <input
        type="search"
        aria-label={label}
        className="demo-field text-sm"
        placeholder="Titre, style ou occasion…"
        maxLength={200}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          data-demo-ready="true"
          aria-label="Effacer la recherche"
          onClick={() => onChange("")}
          className="demo-search-clear text-muted-foreground"
        >
          <Icon i="x" size={16} />
        </button>
      )}
    </div>
  );
}
