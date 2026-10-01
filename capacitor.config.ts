import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.musikpro.app",
  appName: "MusikPro",
  webDir: 'mobile-shell',
  server: {
    url: "https://musikpro.net",
    cleartext: false,
    allowNavigation: ["musikpro.net"],
  },
  plugins: {
    // Connexion Google native (sans Chrome) : seul Google est embarqué.
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
