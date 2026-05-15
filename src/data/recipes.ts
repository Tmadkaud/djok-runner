export interface Recipe {
  id: string;
  name: string;
  rum: string;
  ingredients: string[];
  steps: string[];
  unlockedAfterIsland: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'ti-punch',
    name: 'Ti Punch Djok',
    rum: 'Opportune Djok',
    ingredients: [
      '6 cl de rhum blanc Opportune Djok',
      '1 cuillère de sucre de canne',
      '1 quartier de citron vert',
    ],
    steps: [
      "Presser le citron vert dans un verre.",
      'Ajouter le sucre de canne et écraser.',
      'Verser le rhum, remuer doucement. Sans glace.',
    ],
    unlockedAfterIsland: 'martinique',
  },
  {
    id: 'daiquiri',
    name: 'Daiquiri Bridge',
    rum: 'Opportune Bridge',
    ingredients: [
      '5 cl de rhum Opportune Bridge',
      '2 cl de jus de citron vert',
      '1,5 cl de sirop de canne',
    ],
    steps: [
      'Verser tous les ingrédients dans un shaker avec de la glace.',
      'Shaker énergiquement 10 secondes.',
      'Filtrer dans une coupe glacée. Servir immédiatement.',
    ],
    unlockedAfterIsland: 'barbade',
  },
  {
    id: 'panama-old',
    name: 'Istmo Old Fashioned',
    rum: 'Opportune Istmo',
    ingredients: [
      '6 cl de rhum Opportune Istmo',
      '1 sucre brun',
      '2 traits Angostura',
      'Zeste d\'orange',
    ],
    steps: [
      'Imbiber le sucre des traits d\'Angostura.',
      'Ajouter le rhum et un gros glaçon, remuer.',
      'Frotter le zeste d\'orange sur le bord, déposer dans le verre.',
    ],
    unlockedAfterIsland: 'panama',
  },
  {
    id: 'caipirinha',
    name: 'Caïpirinha Samba',
    rum: 'Opportune Cachaça',
    ingredients: [
      '5 cl de Opportune Cachaça',
      '1 citron vert coupé en quartiers',
      '2 cuillères de sucre de canne',
      'Glace pilée',
    ],
    steps: [
      "Écraser citron et sucre dans un verre old-fashioned.",
      'Remplir de glace pilée.',
      'Verser la cachaça, remuer du bas vers le haut.',
    ],
    unlockedAfterIsland: 'bresil',
  },
  {
    id: 'maya-sour',
    name: 'Maya Sour',
    rum: 'Opportune Quetzal',
    ingredients: [
      '5 cl de Opportune Quetzal',
      '2,5 cl de jus de citron',
      '2 cl de sirop de miel',
      '1 blanc d\'œuf',
    ],
    steps: [
      'Dry shake (sans glace) 10 secondes.',
      'Re-shaker avec de la glace 10 secondes.',
      'Servir dans un verre, décor : zeste de citron.',
    ],
    unlockedAfterIsland: 'guatemala',
  },
  {
    id: 'volcan',
    name: 'Volcán Fizz',
    rum: 'Opportune Volcán',
    ingredients: [
      '5 cl de Opportune Volcán',
      '2 cl de jus de citron',
      '1,5 cl de sirop de gingembre',
      'Top eau gazeuse',
    ],
    steps: [
      'Mélanger rhum, citron, sirop dans un verre highball avec glace.',
      "Allonger d'eau gazeuse.",
      "Décor : tranche de gingembre confit.",
    ],
    unlockedAfterIsland: 'nicaragua',
  },
];
