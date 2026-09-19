import Link from "next/link";
import Icon from "@/components/banani/Icon";

export function AuthLogo() {
  return (
    <Link className="auth-logo" href="/" aria-label="MusikPro — accueil">
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

export function AuthBackLink({ href = "/login", label = "Retour à la connexion" }) {
  return (
    <Link className="auth-back" href={href}>
      <Icon i="arrow-left" size={18} />
      {label}
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
