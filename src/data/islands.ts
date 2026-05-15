export type IslandId =
  | 'martinique'
  | 'barbade'
  | 'panama'
  | 'bresil'
  | 'guatemala'
  | 'nicaragua';

export interface Rum {
  name: string;
  notes: string;
  description: string;
}

export interface Island {
  id: IslandId;
  index: number;
  name: string;
  flag: string;
  region: string;
  palette: {
    sky: [string, string];
    sea: string;
    sand: string;
    foliage: string;
    accent: string;
  };
  obstacleTypes: ObstacleKind[];
  musicMood: string;
  unlockScore: number;
  rum: Rum;
  mapPos: { x: number; y: number };
  shortDescription: string;
}

export type ObstacleKind = 'crab' | 'log' | 'wave' | 'cactus' | 'barrel' | 'parrot';

export const ISLANDS: Record<IslandId, Island> = {
  martinique: {
    id: 'martinique',
    index: 0,
    name: 'Martinique',
    flag: '🇲🇶',
    region: 'Antilles françaises',
    palette: {
      sky: ['#9be7ff', '#ffd9b3'],
      sea: '#1ca7a3',
      sand: '#f4d2a4',
      foliage: '#2e8b57',
      accent: '#e94f8a',
    },
    obstacleTypes: ['crab', 'log', 'parrot'],
    musicMood: 'biguine',
    unlockScore: 0,
    rum: {
      name: 'Opportune Djok',
      notes: 'Canne fraîche · agrumes · poivre blanc',
      description: 'Rhum blanc agricole, signature de la marque, hommage à la femme djok.',
    },
    mapPos: { x: 0.08, y: 0.28 },
    shortDescription: "L'île natale d'Opportune. Rhum agricole pur jus de canne.",
  },
  barbade: {
    id: 'barbade',
    index: 1,
    name: 'Barbade',
    flag: '🇧🇧',
    region: 'Petites Antilles',
    palette: {
      sky: ['#b8e6ff', '#ffe8b3'],
      sea: '#2bb6c2',
      sand: '#f8e0a6',
      foliage: '#3aa856',
      accent: '#ffb347',
    },
    obstacleTypes: ['wave', 'crab', 'log'],
    musicMood: 'calypso',
    unlockScore: 800,
    rum: {
      name: 'Opportune Bridge',
      notes: 'Mélasse · vanille · noix grillée',
      description: 'Rhum de mélasse de tradition anglaise, vieilli en fût de bourbon.',
    },
    mapPos: { x: 0.25, y: 0.7 },
    shortDescription: "Berceau du rhum anglais. Mélasse, vanille et chaleur.",
  },
  panama: {
    id: 'panama',
    index: 2,
    name: 'Panama',
    flag: '🇵🇦',
    region: 'Amérique centrale',
    palette: {
      sky: ['#ffd1a8', '#ff7e75'],
      sea: '#1f8fbf',
      sand: '#e6b87a',
      foliage: '#4a7d3a',
      accent: '#ff5e62',
    },
    obstacleTypes: ['log', 'barrel', 'parrot'],
    musicMood: 'salsa',
    unlockScore: 1800,
    rum: {
      name: 'Opportune Istmo',
      notes: 'Caramel · cacao · tabac blond',
      description: 'Rhum hispanique solera, rondeur tropicale entre deux océans.',
    },
    mapPos: { x: 0.42, y: 0.28 },
    shortDescription: 'Entre Atlantique et Pacifique. Rondeur solera.',
  },
  bresil: {
    id: 'bresil',
    index: 3,
    name: 'Brésil',
    flag: '🇧🇷',
    region: 'Amérique du Sud',
    palette: {
      sky: ['#a3e9d4', '#ffea91'],
      sea: '#1ca37e',
      sand: '#f0c674',
      foliage: '#1f7a3a',
      accent: '#ffce4b',
    },
    obstacleTypes: ['crab', 'log', 'parrot', 'wave'],
    musicMood: 'samba',
    unlockScore: 3000,
    rum: {
      name: 'Opportune Cachaça',
      notes: 'Canne verte · banane · herbe coupée',
      description: 'Cachaça pur jus de canne, fraîche et végétale comme une caïpirinha.',
    },
    mapPos: { x: 0.59, y: 0.7 },
    shortDescription: 'Carnaval, samba et cachaça. Pur jus de canne brésilien.',
  },
  guatemala: {
    id: 'guatemala',
    index: 4,
    name: 'Guatemala',
    flag: '🇬🇹',
    region: 'Amérique centrale',
    palette: {
      sky: ['#ffc4a3', '#7d3f8c'],
      sea: '#3a7a8c',
      sand: '#d9a566',
      foliage: '#3a6b3a',
      accent: '#a64b9c',
    },
    obstacleTypes: ['cactus', 'barrel', 'log'],
    musicMood: 'marimba',
    unlockScore: 4500,
    rum: {
      name: 'Opportune Quetzal',
      notes: 'Miel · épices · bois ancien',
      description: "Rhum solera vieilli en altitude, profond comme la jungle Maya.",
    },
    mapPos: { x: 0.76, y: 0.28 },
    shortDescription: 'Vieillissement solera en altitude. Profondeur Maya.',
  },
  nicaragua: {
    id: 'nicaragua',
    index: 5,
    name: 'Nicaragua',
    flag: '🇳🇮',
    region: 'Amérique centrale',
    palette: {
      sky: ['#ff9a76', '#5a2d82'],
      sea: '#2a5d8a',
      sand: '#caa066',
      foliage: '#2f5a35',
      accent: '#ffb347',
    },
    obstacleTypes: ['barrel', 'cactus', 'log', 'crab'],
    musicMood: 'cumbia',
    unlockScore: 6500,
    rum: {
      name: 'Opportune Volcán',
      notes: 'Fruits confits · cacao · tabac brun',
      description: 'Rhum vieilli au pied des volcans, intensité finale de la collection.',
    },
    mapPos: { x: 0.92, y: 0.7 },
    shortDescription: 'Au pied des volcans. La quintessence de la collection.',
  },
};

export const ISLAND_ORDER: IslandId[] = [
  'martinique',
  'barbade',
  'panama',
  'bresil',
  'guatemala',
  'nicaragua',
];

export function nextIsland(id: IslandId): IslandId | null {
  const idx = ISLAND_ORDER.indexOf(id);
  if (idx === -1 || idx === ISLAND_ORDER.length - 1) return null;
  return ISLAND_ORDER[idx + 1];
}
