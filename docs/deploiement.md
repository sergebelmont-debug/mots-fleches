# Mettre le jeu en ligne

**État actuel : le jeu est en ligne sur GitHub Pages, à l'adresse https://sergebelmont-debug.github.io/mots-fleches/ (dépôt public, première mise en ligne le 16 novembre 2026).**

Pour publier une nouvelle version : onglet **Actions** du dépôt, **Mise en ligne**, **Run workflow**. Rien ne part en ligne automatiquement.

Le jeu est un site « statique » : une fois construit, c'est un simple dossier de fichiers (`dist/`, environ 500 Ko) qui peut être hébergé gratuitement presque partout. Il n'a besoin d'aucun serveur ni d'aucune base de données.

## Construire le jeu

```bash
npm run build
```

Cette commande vérifie d'abord toutes les grilles. Si une seule est invalide, rien n'est construit.

Essayer la version construite sur son ordinateur :

```bash
npm run preview
```

## Option A — GitHub Pages (tout reste sur GitHub)

Adresse obtenue : `https://sergebelmont-debug.github.io/mots-fleches/`

À savoir : avec un compte GitHub gratuit, GitHub Pages ne fonctionne que si le **dépôt est public**. Le code du jeu (y compris les réponses des grilles) devient alors visible par tous. Avec un compte payant (GitHub Pro), le dépôt peut rester privé.

1. Sur GitHub, ouvrir le dépôt, puis **Settings → Pages**.
2. Dans « Build and deployment », choisir la source **GitHub Actions**.
3. Ouvrir l'onglet **Actions**, choisir **Mise en ligne**, cliquer sur **Run workflow**.
4. Deux minutes plus tard, l'adresse du jeu s'affiche dans le résultat.

Pour publier une nouvelle version : refaire l'étape 3. Rien ne part en ligne automatiquement.

## Option B — Netlify, Vercel ou Cloudflare Pages (le dépôt reste privé)

Ces services hébergent gratuitement un site à partir d'un dépôt GitHub privé. Il faut y créer un compte, puis :

- commande de construction : `npm run build`
- dossier à publier : `dist`

Chaque envoi sur la branche `main` met alors le site à jour automatiquement.

## Après la mise en ligne

- **Tester sur un vrai téléphone**, y compris en ouvrant le lien depuis l'application Facebook (son navigateur intégré est le plus capricieux).
- **Partage Facebook** : une fois l'adresse connue, le texte partagé depuis l'écran de fin de grille l'inclut automatiquement.
- **Installation sur l'écran d'accueil** : sur Android, Chrome propose « Installer l'application ». Sur iPhone : bouton Partager de Safari, puis « Sur l'écran d'accueil ».
- **Hors connexion** : après une première visite complète, le jeu se relance sans réseau.

## Ce qui est enregistré et où

La progression, les statistiques et les réglages sont enregistrés **dans le navigateur du joueur**, sur son appareil. Rien n'est envoyé sur un serveur. Conséquences : aucune donnée personnelle à gérer, mais la progression ne suit pas le joueur d'un appareil à l'autre, et elle est perdue s'il efface les données de son navigateur.

## Classements en ligne (non réalisés)

Ils demanderont un service en ligne (Supabase était prévu) et donc un compte à créer, des règles de confidentialité à écrire et une protection contre la triche. C'est un chantier à part entière.
