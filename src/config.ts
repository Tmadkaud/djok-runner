export const COLORS = {
  deep: 0x0a3d4f,
  deepHex: '#0a3d4f',
  turquoise: 0x15a3a3,
  turquoiseHex: '#15a3a3',
  sand: 0xf4d2a4,
  sandHex: '#f4d2a4',
  fuchsia: 0xe94f8a,
  fuchsiaHex: '#e94f8a',
  terracotta: 0xd96b3a,
  terracottaHex: '#d96b3a',
  cream: 0xfff7e8,
  creamHex: '#fff7e8',
  ink: 0x1a1a1a,
  inkHex: '#1a1a1a',
  gold: 0xffd166,
  goldHex: '#ffd166',
  green: 0x4caf50,
  greenHex: '#4caf50',
  red: 0xe53935,
  redHex: '#e53935',
} as const;

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const GROUND_Y = GAME_HEIGHT - 80;

export const STORAGE_KEYS = {
  age: 'opp_age_verified',
  birthYear: 'opp_birth_year',
  mute: 'opp_mute',
  highscore: 'opp_highscore',
  unlockedIslands: 'opp_unlocked_islands',
  collectedRums: 'opp_collected_rums',
  starsByIsland: 'opp_stars_by_island',
  email: 'opp_email',
  promoCode: 'opp_promo_code',
  recipesUnlocked: 'opp_recipes_unlocked',
  cookieConsent: 'opp_cookie_consent',
} as const;

export const BRAND = {
  name: 'OPPORTUNE 1791',
  tagline: 'Tous les chemins mènent au rhum',
  url: 'https://opportune1791.com',
} as const;
