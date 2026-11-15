# Les Mots Fléchés

Jeu de mots fléchés français pour mobile. Les sept phases sont réalisées, à l'exception des classements en ligne. Le jeu n'est pas encore mis en ligne.

Documents : [rapport de tests](docs/rapport-de-tests.md) · [ajouter des grilles](docs/ajouter-des-grilles.md) · [mise en ligne](docs/deploiement.md)

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

### Tests de bout en bout (vrais navigateurs)

À faire une seule fois, pour installer les navigateurs de test :

```bash
npx playwright install chromium webkit
```

Puis :

```bash
npm run test:e2e
```

## Vérifier les grilles

```bash
npm run verifier
```

Chaque grille de `grilles/` est affichée VALIDÉE ou ERREUR, avec la raison. Les lignes « à relire » sont des avertissements non bloquants.

`npm run build` lance d'abord cette vérification : si une seule grille est en erreur, le jeu n'est pas construit.

Pour voir le validateur refuser des grilles volontairement fausses :

```bash
npm run verifier -- tests/grilles-fausses
```

### Erreurs bloquantes

| Code | Signification |
|---|---|
| E-FORMAT | fichier illisible, champ manquant, dimensions ou difficulté invalides |
| E-FLECHE | flèche inconnue |
| E-HORS-GRILLE | case de définition ou réponse hors de la grille |
| E-CROISEMENT | deux lettres différentes sur la même case |
| E-LONGUEUR | la réponse n'a pas la longueur de son emplacement |
| E-CASE-MIXTE | une case sert à la fois de définition et de lettre |
| E-DEF-TROP | plus de deux définitions dans une case, ou deux fois la même flèche |
| E-EMPLACEMENT-DOUBLE | deux mots au même endroit |
| E-MOT-SANS-DEFINITION | des lettres voisines forment un mot que personne ne définit |
| E-CARACTERES | réponse avec autre chose que A-Z en majuscules |
| E-AFFICHAGE | la forme accentuée ne correspond pas à la réponse |
| E-DICTIONNAIRE | mot absent du dictionnaire (faute ou accent oublié) et de `donnees/noms-propres.json` |
| E-REPONSE-DOUBLE | même réponse deux fois dans la grille |
| E-DEFINITION | définition vide |

### Avertissements

A-DEFINITION-DOUBLE, A-REPONSE-DANS-DEFINITION, A-DEFINITION-LONGUE, A-SANS-CROISEMENT, A-CASES-VIDES, A-REPONSE-DANS-AUTRE-DEFINITION.

### Limite

Le validateur garantit la structure et l'orthographe. Il ne peut pas juger si une définition est juste ou ambiguë : cela demande une relecture humaine.

## Ajouter des grilles

Voir [docs/ajouter-des-grilles.md](docs/ajouter-des-grilles.md).

## Organisation

- `grilles/` : une grille = un fichier JSON (liste de mots, la grille de lettres est recalculée).
- `src/engine/` : moteur de grille et règles de jeu, sans affichage.
- `src/validation/` : validateur de grilles, indépendant du moteur et de l'affichage.
- `src/ui/` : écran de jeu, grille, clavier.
- `src/progression/` : étoiles, déblocage des niveaux, statistiques, défi du jour, récompenses.
- `src/storage/` : sauvegarde locale.
- `outils/` : vérification des grilles, contrôle du lexique, génération de grilles.
- `donnees/lexique.txt` : mots et définitions utilisables par le générateur.
- `donnees/gabarits.json` : dispositions de cases.
- `donnees/noms-propres.json` : noms propres autorisés comme réponses.
- `tests-e2e/` : tests de bout en bout, joués dans de vrais navigateurs.
- `public/` : icônes, manifeste et service worker (installation, hors connexion).
- `tests/` : tests automatiques ; `tests/grilles-fausses/` contient des grilles volontairement erronées.

## Convention

Dans les cases : majuscules sans accents (ÎLE s'écrit ILE, CŒUR s'écrit COEUR). Dans les définitions : français normal.
