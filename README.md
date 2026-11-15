# Les Mots Fléchés

Jeu de mots fléchés français pour mobile. Projet en cours : phase 2 (prototype jouable).

## Lancer le jeu

```bash
npm install
```

```bash
npm run dev
```

Puis ouvrir l'adresse affichée (par défaut http://localhost:5173).

## Lancer les tests

```bash
npm test
```

## Organisation

- `grilles/` : une grille = un fichier JSON (liste de mots, la grille de lettres est recalculée).
- `src/engine/` : moteur de grille et règles de jeu, sans affichage.
- `src/ui/` : écran de jeu, grille, clavier.
- `tests/` : tests automatiques du moteur.

## Convention

Dans les cases : majuscules sans accents (ÎLE s'écrit ILE). Dans les définitions : français normal.
