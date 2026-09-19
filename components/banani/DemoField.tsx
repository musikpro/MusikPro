"use client";
import { useDemo } from "./DemoProvider";
export default function DemoField({
  name,
  label,
  placeholder = "",
  multiline = false,
  type = "text",
  maxLength = 1000,
  maxWords,
  className = "text-sm text-foreground",
  rows = 4,
  ariaInvalid = false,
  describedBy,
  transformValue,
  onValueChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  maxLength?: number;
  maxWords?: number;
  className?: string;
  rows?: number;
  ariaInvalid?: boolean;
  describedBy?: string;
  transformValue?: (value: string) => string;
  onValueChange?: (value: string) => void;
}) {
  const demo = useDemo();
  const props = {
    id: `demo-${name}`,
    "aria-label": label,
    autoComplete:
      type === "email" ? "email" : type === "tel" ? "tel-national" : name.endsWith("name") ? "name" : undefined,
    inputMode: type === "tel" ? ("tel" as const) : type === "email" ? ("email" as const) : undefined,
    value: demo.fields[name] ?? "",
    placeholder,
    maxLength,
    "aria-invalid": ariaInvalid || undefined,
    "aria-describedby": describedBy,
    className: `demo-field ${className}`,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = transformValue ? transformValue(event.target.value) : event.target.value;
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (!maxWords || wordCount <= maxWords) {
        demo.field(name, value);
        onValueChange?.(value);
      }
    },
  };
  return multiline ? <textarea {...props} rows={rows} /> : <input {...props} type={type} />;
}
