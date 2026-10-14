import Link from "next/link";
import Icon from "@/components/banani/Icon";
import { translate as t } from "@/lib/i18n/translate";

export function AuthLogo() {
  return (
    <Link className="auth-logo" href="/" aria-label={t("MusikPro — accueil")}>
      <span className="auth-logo-mark">
        <Icon i="music-2" size={23} />
      </span>
      <span>MusikPro</span>
    </Link>
  );
}

export function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.9 20-21 0-1.4-.1-2.7-.5-4z"
      />
      <path
        fill="#34A853"
        d="m6.3 14.7 7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3c-7.8 0-14.5 4.4-18.7 11.7z"
      />
      <path
        fill="#FBBC05"
        d="M24 45c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.4C29.6 35.9 26.9 37 24 37c-5.8 0-10.7-3.9-12.3-9.3l-7 5.4C8.5 41 15.8 45 24 45z"
      />
      <path
        fill="#4285F4"
        d="M44.5 20H24v8.5h11.8c-1 3-3.2 5.5-6.2 7l6.6 5.4C40.6 37.3 44.5 31.3 44.5 24c0-1.4-.1-2.7-.5-4z"
      />
    </svg>
  );
}

export function AppleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function GmailLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M6 42h8V23.5L2 14.5V38c0 2.2 1.8 4 4 4z" />
      <path fill="#34A853" d="M34 42h8c2.2 0 4-1.8 4-4V14.5l-12 9z" />
      <path fill="#FBBC04" d="M34 10v13.5l12-9V12c0-4.9-5.6-7.7-9.6-4.8z" />
      <path fill="#EA4335" d="M14 23.5V10l10 7.5L34 10v13.5L24 31z" />
      <path fill="#C5221F" d="M2 12v2.5l12 9V10L11.6 7.2C7.6 4.3 2 7.1 2 12z" />
    </svg>
  );
}

export function AuthBackLink({ href = "/login", label }: { href?: string; label?: string }) {
  return (
    <Link className="auth-back" href={href}>
      <Icon i="arrow-left" size={18} />
      {label ?? t("Retour à la connexion")}
    </Link>
  );
}

export function AuthHeroIcon({ icon }: { icon: string }) {
  return (
    <div className="auth-hero-icon">
      <Icon i={icon} size={36} />
    </div>
  );
}
