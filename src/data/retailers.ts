// 📝 ÉDITION CLIENT : remplacer ce tableau par la liste réelle des partenaires Opportune 1791.
// Format : ajouter / modifier des entrées Retailer ci-dessous puis sauvegarder.
// Les coordonnées (lat, lng) sont utilisées pour le tri "Près de chez moi" (géolocalisation).
// Pour trouver les coordonnées d'une adresse : https://www.openstreetmap.org → clic droit → "Afficher l'adresse".

export type RetailerType = 'caviste' | 'bar' | 'restaurant' | 'eshop';

export interface Retailer {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  type?: RetailerType;
}

export const RETAILERS: Retailer[] = [
  // ─── EXEMPLES — À REMPLACER PAR LES VRAIS PARTENAIRES ───
  {
    id: 'sample-paris-1',
    name: 'Cave Paris',
    city: 'Paris',
    region: 'Île-de-France',
    country: 'France',
    address: '12 rue de Exemple, 75011 Paris',
    lat: 48.8566,
    lng: 2.3522,
    phone: '+33 1 23 45 67 89',
    website: 'https://example.com',
    type: 'caviste',
  },
  {
    id: 'sample-lyon-1',
    name: 'Caviste Démo Lyon',
    city: 'Lyon',
    region: 'Auvergne-Rhône-Alpes',
    country: 'France',
    address: '5 quai des Exemples, 69002 Lyon',
    lat: 45.7640,
    lng: 4.8357,
    phone: '+33 4 78 00 00 00',
    type: 'caviste',
  },
  {
    id: 'sample-bordeaux-1',
    name: 'Bar à Rhum Démo Bordeaux',
    city: 'Bordeaux',
    region: 'Nouvelle-Aquitaine',
    country: 'France',
    address: "8 cours de l'Exemple, 33000 Bordeaux",
    lat: 44.8378,
    lng: -0.5792,
    website: 'https://example.com',
    type: 'bar',
  },
  {
    id: 'sample-marseille-1',
    name: 'Restaurant Antillais Démo',
    city: 'Marseille',
    region: "Provence-Alpes-Côte d'Azur",
    country: 'France',
    address: '22 rue Exemple, 13001 Marseille',
    lat: 43.2965,
    lng: 5.3698,
    phone: '+33 4 91 00 00 00',
    type: 'restaurant',
  },
  {
    id: 'sample-bxl-1',
    name: 'Cave Canada',
    city: 'Montreal',
    region: 'Quebec',
    country: 'Canada',
    address: '221 rue de la Commune Ouest, H2Y2C9 Montreal',
    lat: 45.501834,
    lng: -73.55387,
    phone: '+1 438 525 0000',
    type: 'caviste',
  },
  {
    id: 'sample-eshop-1',
    name: 'Boutique en ligne Opportune 1791',
    city: 'Livraison France & UE',
    region: 'En ligne',
    country: 'E-shop',
    address: 'Commande en ligne — livraison sous 48-72 h',
    lat: 48.8566,
    lng: 2.3522,
    website: 'https://opportune1791.com',
    type: 'eshop',
  },
];
