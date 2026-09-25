import type { ButtonHTMLAttributes } from "react";

export type AdminButtonVariant = "primary" | "secondary" | "danger";

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
};

const VARIANT_CLASS: Record<AdminButtonVariant, string> = {
  primary: "admin-btn-primary",
  secondary: "admin-btn-secondary",
  danger: "admin-btn-danger",
};

/**
 * Single source of truth for every admin action button — primary (orange fill, the SaaS's
 * main color), secondary (outlined) and danger (destructive). Each variant is a
 * self-contained CSS class with no dependency on its parent's markup, so dropping this
 * button into a new wrapper can never silently pick up an unrelated layout's button styling
 * (which is what previously made "Enregistrer" render as a giant icon-only button, then as a
 * plain unstyled one, on the same page).
 */
export default function AdminButton({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: AdminButtonProps) {
  return <button type={type} className={`admin-btn ${VARIANT_CLASS[variant]} ${className}`.trim()} {...props} />;
}
