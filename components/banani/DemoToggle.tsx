"use client";
import { useDemo } from "./DemoProvider";
export default function DemoToggle({
  toggleKey,
  label,
  large = false,
}: {
  /** Clé canonique de l’état (demo.toggles) : toujours le libellé français, jamais traduit. */
  toggleKey: string;
  /** Libellé accessible affiché (traduit via t()). */
  label: string;
  large?: boolean;
}) {
  const demo = useDemo();
  const checked = !!demo.toggles[toggleKey];
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => demo.toggle(toggleKey)}
      className={`demo-toggle ${large ? "w-12 h-7" : "w-10 h-6"} rounded-full flex items-center ${checked ? "bg-primary justify-end pr-1" : "bg-muted justify-start pl-1"}`}
    >
      <span className={`w-5 h-5 ${large && !checked ? "bg-muted-foreground" : "bg-white"} rounded-full`} />
    </button>
  );
}
