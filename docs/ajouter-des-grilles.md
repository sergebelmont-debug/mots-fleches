# Ajouter des grilles

Une grille est un fichier `grilles/NNN.json`. Le jeu charge automatiquement tous les fichiers de ce dossier, dans l'ordre des numéros : il n'y a aucun code à modifier.

Il y a deux façons de créer une grille.

## 1. Avec l'outil de génération (recommandé)

L'outil remplit un gabarit (la disposition des cases) avec des mots du lexique.

```bash
npm run generer -- --id 019 --titre "Mon titre" --gabarit moyen --difficulte intermediaire
```

Options :

| Option | Valeurs | Rôle |
|---|---|---|
| `--id` | `019` | Numéro de la grille (obligatoire) |
| `--titre` | texte | Titre affiché dans le parcours (obligatoire) |
| `--gabarit` | `petit`, `petit2`, `moyen`, `moyen2`, `grand` | Disposition des cases (voir `donnees/gabarits.json`) |
| `--difficulte` | `facile`, `intermediaire`, `difficile`, `expert` | Niveau ; autorise des mots plus rares |
| `--theme` | `nature`, `cuisine`, `musique`, `geo`, `histoire`, `sport`, `sciences`, `cinema` | Préfère les mots de ce thème |
| `--graine` | nombre | Change le tirage ; même graine = même grille |
| `--remplacer` | `oui` | Autorise l'écrasement d'une grille existante |

L'outil :

- limite les répétitions (un mot de 4 lettres ou plus apparaît au plus 2 fois dans tout le jeu) ;
- passe la grille au validateur et **n'écrit rien si elle est refusée** ;
- indique combien de mots du thème il a réussi à placer. S'il y en a peu, ne donnez pas à la grille un titre thématique.

S'il répond « Aucun remplissage trouvé », essayez une autre `--graine`, un autre gabarit, ou enrichissez le lexique.

## 2. Enrichir le lexique

Le lexique est le fichier `donnees/lexique.txt`. Plus il est riche, plus l'outil produit de grilles variées. Une ligne par mot :

```
ÎLE|1|geo|Entourée d'eau
PARIS|1|geo|Ville lumière|propre
```

Dans l'ordre : le mot **avec ses accents**, le niveau (1 courant, 2 moyen, 3 rare), le thème (facultatif), la définition (24 caractères au plus), et `propre` pour un nom propre.

Un nom propre doit aussi être ajouté à `donnees/noms-propres.json`.

Contrôler le lexique (orthographe, accents, doublons, longueur des définitions) :

```bash
npm run lexique
```

## 3. À la main

Copiez une grille existante et modifiez-la. Chaque mot indique :

- `caseDefinition` : `[ligne, colonne]` de la case qui contient la définition (on compte à partir de 0) ;
- `fleche` : `droite`, `bas`, `droite-puis-bas` (le mot commence à droite et descend) ou `bas-puis-droite` (le mot commence dessous et part à droite) ;
- `definition` : le texte de l'indice ;
- `reponse` : en majuscules sans accents (`ILE`) ;
- `affichage` : la forme correcte (`ÎLE`).

La grille de lettres n'est pas écrite dans le fichier : elle est recalculée à partir des mots.

## 4. Toujours vérifier, puis relire

```bash
npm run verifier
```

Une grille en ERREUR empêche la construction du jeu. Les lignes « à relire » sont des avertissements.

Le validateur garantit la structure et l'orthographe. **Il ne juge pas la qualité des définitions** : relisez chaque nouvelle grille en vous demandant si chaque définition mène à une seule réponse.

## Créer un gabarit

Dans `donnees/gabarits.json`, un gabarit est une liste de lignes où `D` est une case de définition et `L` une case de lettre. Règles :

- chaque suite de 2 lettres ou plus (horizontale ou verticale) est un mot ;
- chaque mot doit toucher une case `D` : à gauche ou au-dessus de sa première lettre ;
- une case `D` porte au plus 2 définitions.

Plus un gabarit contient de grands blocs de lettres, plus il est difficile à remplir.
