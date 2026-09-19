export const demoOccasions = [
  { emoji: "🎂", label: "Anniversaire", id: "birthday" },
  { emoji: "💕", label: "Amour", id: "love" },
  { emoji: "🎓", label: "Graduation", id: "graduation" },
  { emoji: "🎉", label: "Fête", id: "party" },
  { emoji: "💔", label: "Séparation", id: "breakup" },
  { emoji: "🙏", label: "Gratitude", id: "gratitude" },
  { emoji: "🌙", label: "Sérénité", id: "serenity" },
  { emoji: "🔥", label: "Motivation", id: "motivation" },
];

export function demoOccasionEmoji(label: string) {
  return demoOccasions.find((occasion) => occasion.label === label)?.emoji ?? "";
}

const t = (text: string) => text;

export const demoGeneratedSongs = [
  {
    id: 1,
    title: "Pour toi Mariam",
    occasion: "Anniversaire",
    style: "Afrobeat",
    date: "21 juillet 2025",
    versions: [
      { label: "Version 1", duration: "1m 32s", plays: 14, liked: true },
      { label: "Version 2", duration: "1m 45s", plays: 8, liked: false },
    ],
  },
  {
    id: 2,
    title: "Mon mariage",
    occasion: "Mariage",
    style: "Amapiano",
    date: "20 juillet 2025",
    versions: [
      { label: "Version 1", duration: "1m 48s", plays: 22, liked: true },
      { label: "Version 2", duration: "1m 55s", plays: 5, liked: false },
    ],
  },
  {
    id: 3,
    title: "Gloire à Dieu",
    occasion: "Hommage",
    style: "Gospel",
    date: "19 juillet 2025",
    versions: [
      { label: "Version 1", duration: "2m 04s", plays: 31, liked: true },
      { label: "Version 2", duration: "1m 58s", plays: 18, liked: true },
    ],
  },
];

export const demoLibrarySongs = [
  {
    id: 1,
    title: "Mama Africa",
    plays: "12k",
    style: "Afrobeat",
    img: "vibrant African music concert stage with warm orange lights, celebration atmosphere",
    duration: "3:42",
    artist: "Communauté Musika",
    likes: 1204,
  },
  {
    id: 2,
    title: "Gloire à Toi",
    plays: "15k",
    style: "Gospel",
    img: "joyful gospel choir in colorful African church, warm sunlight, celebration",
    duration: "4:15",
    artist: "Communauté Musika",
    likes: 892,
  },
  {
    id: 3,
    title: "Mon Rêve",
    plays: "8.5k",
    style: "Amapiano",
    img: "modern African music production studio with neon lights and African instruments",
    duration: "3:28",
    artist: "Communauté Musika",
    likes: 654,
  },
  {
    id: 4,
    title: "Danse avec Moi",
    plays: "11k",
    style: "Zouglou",
    img: "energetic African street dance scene with colorful clothing and joyful atmosphere",
    duration: "3:56",
    artist: "Communauté Musika",
    likes: 743,
  },
];

export const demoFavoriteSongs = [
  {
    id: 1,
    title: "Pour toi Mariam",
    occasion: "Anniversaire",
    style: "Afrobeat",
    date: "21 juillet 2025",
    plays: 1240,
    liked: true,
    img: "vibrant African music concert stage with warm orange lights, celebration atmosphere",
  },
  {
    id: 2,
    title: "Gloire à Toi",
    occasion: "Hommage",
    style: "Gospel",
    date: "20 juillet 2025",
    plays: 2150,
    liked: true,
    img: "joyful gospel choir in colorful African church, warm sunlight, celebration",
  },
  {
    id: 3,
    title: "Danse la Nuit",
    occasion: "Fête",
    style: "Zouglou",
    date: "18 juillet 2025",
    plays: 890,
    liked: true,
    img: "energetic African street dance scene with colorful clothing and joyful atmosphere",
  },
  {
    id: 4,
    title: "Mon Rêve",
    occasion: "Motivation",
    style: "Amapiano",
    date: "15 juillet 2025",
    plays: 650,
    liked: true,
    img: "modern African music production studio with neon lights and African instruments",
  },
];

export const demoNotifications = [
  {
    id: 1,
    type: "music",
    title: "Génération terminée",
    message: 'Votre chanson "Danse la Nuit" est prête à écouter !',
    time: "Il y a 2h",
    unread: true,
  },
  {
    id: 2,
    type: "heart",
    title: "Nouvelles likes",
    message: 'Votre chanson "Pour toi Mariam" a reçu 12 likes.',
    time: "Il y a 5h",
    unread: true,
  },
  {
    id: 3,
    type: "play",
    title: "Nouvelles écoutes",
    message: 'Votre chanson "Rêve d\'Afrique" a été écoutée 45 fois.',
    time: "Hier",
    unread: false,
  },
  {
    id: 4,
    type: "bell",
    title: "Concours du mois",
    message: "Participez à notre concours mensuel et gagnez des chansons !",
    time: "Il y a 2 jours",
    unread: false,
  },
  {
    id: 5,
    type: "mail",
    title: "Promotion spéciale",
    message: "Profitez de 20% de réduction sur votre prochain abonnement.",
    time: "Il y a 3 jours",
    unread: false,
  },
];

export const demoSongPacks = [
  {
    id: 1,
    name: t("Découverte"),
    songs: 2,
    price: "1 000 FCFA",
    priceValue: 1000,
    description: t("Parfait pour commencer"),
    popular: false,
    bonus: null,
  },
  {
    id: 2,
    name: t("Populaire"),
    songs: 5,
    price: "2 000 FCFA",
    priceValue: 2000,
    description: t("Meilleur rapport qualité-prix"),
    popular: true,
    bonus: null,
  },
  {
    id: 3,
    name: t("Maxi"),
    songs: 12,
    price: "5 000 FCFA",
    priceValue: 5000,
    description: t("Pour les gros créateurs"),
    popular: false,
    bonus: null,
  },
  {
    id: 4,
    name: t("Illimité (1 mois)"),
    songs: null,
    price: "10 000 FCFA",
    priceValue: 10000,
    description: t("Créer autant que tu veux"),
    popular: false,
    bonus: t("Accès complet"),
  },
];

export const demoCurrencies = [
  { code: "XOF", label: "Franc CFA (XOF)", symbol: "FCFA" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "USD", label: "Dollar ($)", symbol: "$" },
  { code: "NGN", label: "Naira (₦)", symbol: "₦" },
] as const;

export function formatDemoPackPrice(valueInFcfa: number, currency: string) {
  if (currency === "EUR") return `${(valueInFcfa / 655.957).toFixed(2).replace(".", ",")} €`;
  if (currency === "USD") return `$${(valueInFcfa / 600).toFixed(2)}`;
  if (currency === "NGN") return `₦${Math.round(valueInFcfa * 2.7).toLocaleString("en-NG")}`;
  return `${valueInFcfa.toLocaleString("fr-FR")} FCFA`;
}

export const demoLyrics =
  "Une histoire de beauté et d'amour\nCélébrons ce jour merveilleux ensemble\nAu rythme de l'Afrique, dansons sans fin\nCette chanson est pour toi, mon ami\n\nDans les rues de notre quartier\nOù les rires résonnent à chaque coin\nTu es né pour briller et rayonner\nEt nous dansons sous les étoiles";

export const demoDiscoverSongs = [
  {
    title: "Mama Africa",
    plays: "12k",
    style: "Afrobeat",
    img: "vibrant African music concert stage with warm orange lights, celebration atmosphere",
  },
  {
    title: "Gloire à Toi",
    plays: "15k",
    style: "Gospel",
    img: "joyful gospel choir in colorful African church, warm sunlight, celebration",
  },
  {
    title: "Mon Rêve",
    plays: "8.5k",
    style: "Amapiano",
    img: "modern African music production studio with neon lights and African instruments",
  },
  {
    title: "Danse avec Moi",
    plays: "11k",
    style: "Zouglou",
    img: "energetic African street dance scene with colorful clothing and joyful atmosphere",
  },
  {
    title: "Cœur Sincère",
    plays: "6.3k",
    style: "R&B",
    img: "intimate African musician performing with acoustic guitar under warm stage lighting",
  },
  {
    title: "Unité Africaine",
    plays: "9.7k",
    style: "Reggae",
    img: "peaceful African landscape sunset with silhouettes of musicians playing reggae",
  },
];
