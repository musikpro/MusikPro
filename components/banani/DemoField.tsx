"use client";
import { useDemo } from "./DemoProvider";
export default function DemoField({
  name,
  label,
  placeholder = "",
  multiline = false,
  type = "text",
  maxLength = 1000,
  className = "text-sm text-foreground",
  rows = 4,
}: {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  maxLength?: number;
  className?: string;
  rows?: number;
}) {
  const demo = useDemo();
  const props = {
    id: `demo-${name}`,
    "aria-label": label,
    autoComplete:
      type === "email"
        ? "email"
        : type === "tel"
          ? "tel-national"
          : name.endsWith("name")
            ? "name"
            : undefined,
    inputMode:
      type === "tel"
        ? ("tel" as const)
        : type === "email"
          ? ("email" as const)
          : undefined,
    value: demo.fields[name] ?? "",
    placeholder,
    maxLength,
    className: `demo-field ${className}`,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => demo.field(name, event.target.value),
  };
  return multiline ? (
    <textarea {...props} rows={rows} />
  ) : (
    <input {...props} type={type} />
  );
}
