# 🥃 Djok Runner — Opportune 1791

Jeu marketing **Phaser 3 + TypeScript + Vite** pour la marque de rhum **Opportune 1791**.

Un endless runner tropical mettant en scène **Opportune**, héroïne djok martiniquaise,
qui parcourt 6 destinations productrices de rhum (Martinique, Barbade, Panama, Brésil,
Guatemala, Nicaragua). Chaque île est un niveau avec son ambiance visuelle, sa
musique procédurale et son rhum à débloquer.

> ⚠️ **Mention légale** — Le jeu intègre un age-gate obligatoire (18+) et le bandeau
> sanitaire « L'abus d'alcool est dangereux pour la santé. À consommer avec modération »
> est affiché en permanence, conformément aux obligations légales (loi Évin).

## ✨ Fonctionnalités

### Gameplay
- 🏃 Course infinie avec saut, **double-saut**, slide et air-slam
- 🎯 Combos collectibles (multiplicateur jusqu'à x5)
- ❤️ 3 vies + cœurs bonus à ramasser
- ⚡ 4 power-ups : invincibilité (perle), aimant à fûts, boost de vitesse, x2 score
- 🌋 **Défi final** par île qui débloque le rhum local et l'île suivante
- ⭐ Système 1–3 étoiles selon le score

### 6 îles / 6 ambiances
| Île | Musique | Obstacles | Rhum débloqué |
|---|---|---|---|
| 🇲🇶 Martinique | biguine | crabe, tronc, perroquet | Opportune Djok |
| 🇧🇧 Barbade | calypso | vague, crabe, tronc | Opportune Bridge |
| 🇵🇦 Panama | salsa | tronc, tonneau, perroquet | Opportune Istmo |
| 🇧🇷 Brésil | samba | crabe, tronc, perroquet, vague | Opportune Cachaça |
| 🇬🇹 Guatemala | marimba | cactus, tonneau, tronc | Opportune Quetzal |
| 🇳🇮 Nicaragua | cumbia | tonneau, cactus, tronc, crabe | Opportune Volcán |

### Marketing & conversion
- 🔞 **Age-gate** légal au lancement
- 💌 **Capture e-mail** newsletter en fin de partie (vie bonus + recettes)
- 📣 **Partage social** (WhatsApp / Facebook / X / lien copié) avec image dynamique générée
- 🎁 **Code promo unique** -10% par joueur
- 🏆 **Leaderboard** local avec étoiles & rhums collectés
- 🍹 **6 recettes de cocktails** débloquables comme lead magnet
- 📊 Événements **GA4** (game_start, level_complete, email_submit, share_click, promo_redeem…)
- 🍪 Bandeau **consentement cookies** RGPD

### Direction artistique & sonore
- 🎨 Tous les visuels sont **générés procéduralement** (canvas) — zéro asset externe
- 🔊 **Moteur audio Web Audio** maison : SFX à pitch montant en combo, musique procédurale
  par île (basse + lead + percussions + kick) bouclée par scheduler
- ✨ VFX : particules de sable, screen shake sur impact, flash de collecte, slow-motion à la mort
- 📱 Adaptatif desktop + mobile (boutons tactiles)

## 🚀 Démarrer

```bash
npm install
npm run dev      # serveur de dev sur http://localhost:5173
npm run build    # build production dans dist/
npm run preview  # preview du build
```

**Stack** : Phaser 3.90 · TypeScript 5 · Vite 5 · WebAudio API natif

## 🎮 Contrôles

| Action | Clavier | Tactile |
|---|---|---|
| Sauter / Double-sauter | `↑` ou `Espace` | Tap haut écran ou bouton ▲ |
| Glisser / Air-slam | `↓` ou `S` | Tap bas écran ou bouton ▼ |
| Pause | `P` ou `Échap` | — |
| Mute | clic 🔊 | tap 🔊 |

## 📁 Architecture

```
src/
├── main.ts                    # entrypoint + Phaser config
├── config.ts                  # constantes (couleurs, dimensions, storage keys)
├── styles.css                 # CSS global + bandeau sanitaire
├── data/
│   ├── islands.ts             # définition des 6 îles + rhums
│   └── recipes.ts             # 6 recettes de cocktails
├── systems/
│   ├── state.ts               # state global + persistance localStorage
│   ├── audio.ts               # moteur audio procédural (SFX + musique)
│   ├── analytics.ts           # tracking GA4
│   └── textures.ts            # génération procédurale de tous les sprites
├── ui/
│   └── widgets.ts             # boutons, titres, fades
└── scenes/
    ├── BootScene.ts           # age-gate + chargement
    ├── MainMenuScene.ts       # menu principal
    ├── MapScene.ts            # carte du monde + déblocage
    ├── LevelScene.ts          # gameplay runner
    ├── HUDScene.ts            # interface en jeu
    ├── GameOverScene.ts       # écran fin + 3 CTAs marketing
    ├── LeaderboardScene.ts    # classement local
    └── RecipesScene.ts        # recettes débloquées
```

## 📈 Analytics — événements trackés

| Événement | Quand |
|---|---|
| `age_gate_pass` / `age_gate_fail` | Age-gate validé/refusé |
| `level_start` / `level_complete` | Démarrage / fin d'île |
| `game_over` | Mort du joueur |
| `email_submit` | E-mail soumis dans Game Over |
| `share_click` | Partage sur un réseau |
| `promo_code_generated` / `promo_code_revealed` | Code promo |
| `recipe_unlocked` | Recette débloquée |
| `product_link_click` | Clic vers la boutique |

Pour activer le tracking en production, définir la variable d'environnement
`VITE_GA4_ID` (voir section [Déploiement](#-déploiement) ci-dessous).
Le tracking n'est activé qu'après acceptation du bandeau cookies.

## 🌐 Déploiement

Le build produit un site **100% statique** (`npm run build` → `dist/`) déployable
tel quel sur n'importe quel hébergeur de fichiers statiques. Les configurations
des 4 plateformes ci-dessous sont déjà fournies dans le repo : il suffit de
choisir, connecter et pousser.

### Prérequis

- **Node 20+** et **npm** (le build est verrouillé sur Node 20 dans tous les CI).
- Un compte sur la plateforme de destination + le repo accessible.

### 🟢 Netlify — `netlify.toml`

1. Sur [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**.
2. Sélectionner le dépôt. Tous les paramètres sont auto-détectés via
   [`netlify.toml`](./netlify.toml) :
   - Build : `npm run build`
   - Publish : `dist`
   - Node : 20
   - SPA fallback + cache headers (assets immutables 1 an, `index.html` revalidé).
3. (Optionnel) **Domain settings → Add custom domain** → `jeu.opportune1791.com`
   puis suivre les instructions DNS (CNAME vers `<site>.netlify.app`).
4. (Optionnel) **Site settings → Environment variables** → ajouter `VITE_GA4_ID`
   = `G-XXXXXXX` pour activer GA4.

### ▲ Vercel — `vercel.json`

1. Sur [vercel.com/new](https://vercel.com/new) → importer le repo *ou* depuis
   un poste de dev :
   ```bash
   npx vercel        # preview
   npx vercel --prod # production
   ```
2. La config [`vercel.json`](./vercel.json) déclare framework=Vite, output `dist`,
   SPA rewrite et cache headers.
3. (Optionnel) **Settings → Domains** → ajouter `jeu.opportune1791.com`.
4. (Optionnel) **Settings → Environment Variables** → `VITE_GA4_ID`
   (cocher Production / Preview selon besoin), puis re-déployer.

### 🟧 Cloudflare Pages

1. Dashboard Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
2. Sélectionner le repo. Renseigner :
   - **Framework preset** : *Vite* (auto-détecté)
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
3. Le SPA fallback et les cache headers sont gérés automatiquement par
   [`public/_redirects`](./public/_redirects) et [`public/_headers`](./public/_headers)
   qui sont copiés tels quels dans `dist/` au build.
4. (Optionnel) **Custom domains** → `jeu.opportune1791.com`.
5. (Optionnel) **Settings → Environment variables** → `VITE_GA4_ID`
   (uniquement variable *Production*, pas un secret), puis redéployer.

### 🐙 GitHub Pages — `.github/workflows/deploy.yml`

1. Dans le repo : **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. (Optionnel) **Settings → Secrets and variables → Actions → New repository secret**
   → `VITE_GA4_ID` = `G-XXXXXXX`.
3. Pousser sur `main` (ou déclencher manuellement *Run workflow*).
   Le workflow [`deploy.yml`](./.github/workflows/deploy.yml) :
   - checkout → setup Node 20 (cache npm) → `npm ci` → `npm run build`
   - upload de `dist/` puis `actions/deploy-pages@v4`
4. (Optionnel) Domaine custom : ajouter un fichier `public/CNAME` contenant
   `jeu.opportune1791.com` et configurer le DNS (CNAME vers
   `<owner>.github.io`).

### 📊 Variable d'environnement GA4

Le tracking GA4 est **opt-in** :

- Variable : `VITE_GA4_ID` (ex. `G-XXXXXXXXXX`). Vide ou absent ⇒ tracking désactivé.
- Voir [`.env.example`](./.env.example). Pour un test local :
  ```bash
  cp .env.example .env
  echo "VITE_GA4_ID=G-XXXXXXXXXX" > .env
  npm run dev
  ```
- Le snippet gtag.js n'est injecté **qu'après acceptation du bandeau cookies**
  (`state.cookieConsent === true`). Aucune requête vers Google n'est émise
  avant consentement explicite — conformité RGPD.

### 🌍 Domaine personnalisé `jeu.opportune1791.com`

Quelle que soit la plateforme retenue, pointer un sous-domaine vers le site
nécessite un **enregistrement DNS CNAME** chez le registrar du domaine
`opportune1791.com` :

| Plateforme | Cible CNAME |
|---|---|
| Netlify | `<site>.netlify.app` |
| Vercel | `cname.vercel-dns.com` |
| Cloudflare Pages | `<project>.pages.dev` |
| GitHub Pages | `<owner>.github.io` |

Le HTTPS est provisionné automatiquement (Let's Encrypt) après propagation DNS.

### ⚖️ Rappel légal (loi Évin)

Quel que soit l'hébergeur :

- L'**age-gate 18+** doit rester actif au premier lancement (géré côté client
  dans `BootScene`, persisté via `localStorage`).
- Le **bandeau sanitaire** « *L'abus d'alcool est dangereux pour la santé.
  À consommer avec modération* » doit rester visible en permanence (injecté
  dans [`index.html`](./index.html) et stylé dans `src/styles.css`).
- Ne supprimer **ni** l'age-gate **ni** le bandeau lors de personnalisations.

## 🛣️ Roadmap (suggestions v2)

- 🌍 Localisation EN / ES (marchés Caraïbes & LatAm)
- 🛰️ Leaderboard global (Netlify Functions + KV store)
- 🗺️ Locator de cavistes (Google Maps API)
- 🎯 Intégration directe Brevo / Mailchimp pour la capture e-mail
- 📸 Téléchargement de l'image de partage générée
- 🎨 Remplacement progressif des assets procéduraux par illustrations brandées

## 📝 Licence

Code propriétaire — Opportune 1791. Tous droits réservés.
À consommer avec modération.
