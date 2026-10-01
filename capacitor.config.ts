import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.musikpro.app",
  appName: "MusikPro",
  webDir: 'mobile-shell',
  // Couleur du site : sans elle la WebView est noire tant que la page ne s'affiche pas.
  backgroundColor: "#fafaf7",
  server: {
    url: "https://musikpro.net",
    cleartext: false,
    allowNavigation: ["musikpro.net"],
    // Page locale (mobile-shell/offline.html) affichée si le site ne se charge pas, au lieu d'un écran noir figé.
    errorPath: "offline.html",
  },
  plugins: {
    // Écran de démarrage plein écran (resources/splash.png) : l'application charge le site hébergé, donc
    // le splash système seul disparaît avant l'affichage de la page. Durée fixe, repli sûr hors ligne.
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#FB5104",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Connexion Google native (sans Chrome) : seul Google est embarqué.
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
