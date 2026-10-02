"use client";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";

export const displayName = "Centre de notifications";
export const screenSize = "mobile";

import Icon from "./Icon";

const getNotifications = () => [
  {
    id: 1,
    type: "music",
    title: t("Génération terminée"),
    message: t('Votre chanson "Danse la Nuit" est prête à écouter !'),
    time: t("Il y a 2h"),
    unread: true,
  },
  {
    id: 2,
    type: "heart",
    title: t("Nouvelles likes"),
    message: t('Votre chanson "Pour toi Mariam" a reçu 12 likes.'),
    time: t("Il y a 5h"),
    unread: true,
  },
  {
    id: 3,
    type: "play",
    title: t("Nouvelles écoutes"),
    message: t('Votre chanson "Rêve d\'Afrique" a été écoutée 45 fois.'),
    time: t("Hier"),
    unread: false,
  },
  {
    id: 4,
    type: "bell",
    title: t("Concours du mois"),
    message: t("Participez à notre concours mensuel et gagnez des chansons !"),
    time: t("Il y a 2 jours"),
    unread: false,
  },
  {
    id: 5,
    type: "mail",
    title: t("Promotion spéciale"),
    message: t("Profitez de 20% de réduction sur votre prochain abonnement."),
    time: t("Il y a 3 jours"),
    unread: false,
  },
];

const getIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    music: "music",
    heart: "heart",
    play: "play",
    bell: "bell",
    mail: "mail",
  };
  return iconMap[type] || "bell";
};

export default function NotificationCenterScreen() {
  const demo = useDemo();
  const visibleNotifications = demo.isDemo ? getNotifications() : [];
  return (
    <div className="bg-background flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/menu")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <h1 className="text-sm font-medium text-muted-foreground">{t("Notifications")}</h1>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.setReadNotifications(visibleNotifications.map((n) => n.id))}
          className="text-sm font-semibold text-primary"
        >
          {t("Marquer tout")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-2">
        {visibleNotifications.length === 0 && (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
            <Icon i="bell" size={26} className="mx-auto mb-2 text-primary" />
            <p className="font-semibold text-foreground">{t("Aucune notification")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("Tes prochaines notifications apparaîtront ici.")}</p>
          </div>
        )}
        {visibleNotifications.map((notif) => (
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.setReadNotifications([...demo.readNotifications, notif.id])}
            key={notif.id}
            className={`w-full flex gap-3 p-3 rounded-xl border transition-colors ${
              notif.unread && !demo.readNotifications.includes(notif.id)
                ? "bg-secondary/20 border-secondary"
                : "bg-card border-border"
            }`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                notif.unread && !demo.readNotifications.includes(notif.id) ? "bg-primary" : "bg-muted"
              }`}
            >
              <Icon
                i={getIcon(notif.type)}
                size={18}
                className={
                  notif.unread && !demo.readNotifications.includes(notif.id)
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }
              />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground">{notif.title}</h3>
                {notif.unread && !demo.readNotifications.includes(notif.id) && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Empty state message if no notifications */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        {/* This div is for layout balance - would be hidden if notifications exist */}
      </div>
    </div>
  );
}
