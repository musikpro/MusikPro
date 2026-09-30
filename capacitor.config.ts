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
};

export default config;
