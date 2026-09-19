import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

type NoticeTone = "error" | "success" | "info" | "warning";

const noticeIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
} as const;

export function InlineNotice({
  children,
  tone = "info",
  className = "",
  id,
  onDismiss,
}: {
  children: React.ReactNode;
  tone?: NoticeTone;
  className?: string;
  id?: string;
  onDismiss?: () => void;
}) {
  const NoticeIcon = noticeIcons[tone];
  return (
    <div
      id={id}
      className={`site-notice site-notice-${tone} ${className}`.trim()}
      role={tone === "error" ? "alert" : "status"}
    >
      <NoticeIcon className="site-notice-icon" size={17} aria-hidden="true" />
      <span className="site-notice-message">{children}</span>
      {onDismiss && (
        <button type="button" className="site-notice-dismiss" onClick={onDismiss} aria-label="Fermer la notification">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
