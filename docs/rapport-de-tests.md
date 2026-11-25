# Rapport de tests

État au 25 novembre 2026. Tous les résultats ci-dessous viennent de commandes réellement exécutées ; chacune peut être relancée.

## Résumé

| Série | Commande | Résultat |
|---|---|---|
| Lexique (1 244 mots) | `npm run lexique` | Validé |
| Grilles (30 du parcours + 6 Serge Belmont) | `npm run verifier` | 36 validées, 0 refusée, 0 avertissement |
| Répétitions entre les niveaux du parcours | `npm run verifier` | Aucun problème |
| Tests du moteur, du validateur, de la progression | `npm test` | 215 réussis sur 215 |
| Tests de bout en bout, 4 appareils simulés | `npm run test:e2e` | 67 réussis, 5 non applicables, 0 échec  |
| Construction du jeu | `npm run build` | Réussie |
| Vérification automatique sur GitHub | à chaque envoi | Réussie |
| Version en ligne (https://sergebelmont.com/mots-fleches/) | ouverture en format téléphone, parcours, saisie d'un mot, sauvegarde, service worker | Réussie |

## Tests réussis

### Validation des grilles (déterministe)

- Chaque règle bloquante est testée avec une grille volontairement fausse : conflit de croisement, longueur incorrecte, mot hors grille, case utilisée deux fois, flèche inconnue ou mal orientée, plus de deux définitions par case, deux mots au même endroit, mot formé sans définition, caractères interdits, accent oublié, faute d'orthographe, réponse en double, définition vide, nom propre non déclaré.
- Les quatre grilles fausses de `tests/grilles-fausses/` sont refusées avec le bon message.
- La construction du jeu est refusée si une grille invalide est présente.
- La même grille vérifiée deux fois donne exactement le même rapport.

### Répétitions entre les niveaux

Règles vérifiées automatiquement, et bloquantes (une grille qui les enfreint empêche la construction du jeu) :

- un mot de 4 lettres ou plus n'apparaît qu'une seule fois dans les 30 niveaux ;
- un mot de 3 lettres apparaît au plus 2 fois, à au moins 10 niveaux d'écart ;
- un mot de 2 lettres apparaît au plus 5 fois, jamais dans deux niveaux qui se suivent ;
- deux niveaux qui se suivent n'ont donc **aucun** mot en commun ;
- un petit mot qui revient change le plus souvent de définition (plusieurs définitions par petit mot dans le lexique).

Avant cette correction : 48 mots longs revenaient deux fois, et 28 mots étaient partagés entre deux niveaux consécutifs.

Contrôles ajoutés à l'intérieur d'une grille : deux mots de la même famille (USE et USER), et une définition qui donne un petit mot voisin (DO défini par « Ut moderne » quand UT est dans la grille).

### Moteur de jeu

- Sélection d'un mot, d'une case ; changement de sens au croisement ; mot suivant.
- Saisie, passage automatique au mot suivant, lettres de croisement partagées, caractères non valides ignorés.
- **Les lettres déjà posées par un mot croisé sont sautées** : le joueur ne tape que les lettres manquantes ; un mot déjà complet se corrige case après case.
- Effacement d'une lettre, d'un mot ; lettres révélées par indice protégées.
- Vérification : seules les lettres fausses sont marquées ; la marque disparaît à la correction.
- **Les 30 grilles sont résolues lettre par lettre** et se terminent correctement.
- La difficulté ne redescend jamais le long du parcours ; aucun mot de 4 lettres ou plus n'apparaît plus de deux fois dans tout le jeu.

### Progression, sauvegarde, statistiques

- Étoiles, déblocage des niveaux, meilleur résultat conservé.
- Sauvegarde relue à l'identique ; sauvegarde absente, abîmée ou d'une ancienne version : le jeu démarre quand même.
- Séries de jours (y compris changement de mois et d'année), défi du jour (même date = même grille), 16 récompenses, résumé statistique.

### Univers Serge Belmont

- Les 6 grilles sont validées, sans avertissement, et résolues lettre par lettre.
- Lexique de l'univers contrôlé (orthographe, accents, longueur des définitions).
- Chaque définition entre guillemets complète un vrai titre ou une vraie citation de la fiche fournie.
- SERGE, BELMONT et NOSTALGIA figurent parmi les réponses ; aucun mot n'apparaît plus de deux fois ; au moins un tiers des mots de chaque grille vient de l'univers.
- Cases noires : déclarées dans chaque grille, signalées si elles ne le sont pas.

### De bout en bout, dans de vrais navigateurs

Appareils simulés : Android (Chrome, 412 × 839), iPhone (moteur de Safari, 390 × 664), petit écran (moteur de Safari, 320 × 568), ordinateur (Chrome).

| Scénario | Android | iPhone | Petit écran | Ordinateur |
|---|---|---|---|---|
| Accueil : tous les boutons accessibles | ✓ | ✓ | ✓ | ✓ |
| Parcours : 30 niveaux, un seul ouvert au départ | ✓ | ✓ | ✓ | ✓ |
| Niveau 1 complet (facile, avec accents) : erreur, vérification, indice, fin, niveau suivant | ✓ | ✓ | ✓ | ✓ |
| Croisement : changement de sens | ✓ | ✓ | ✓ | ✓ |
| Effacer une lettre, un mot ; mot suivant | ✓ | ✓ | ✓ | ✓ |
| Reprise d'une partie après rechargement | ✓ | ✓ | ✓ | ✓ |
| Mise en page : pas de défilement de page, clavier sous la grille, touches et cases assez grandes | ✓ | ✓ | ✓ | ✓ |
| Grille intermédiaire (niveau 16) jouée jusqu'au bout | ✓ | ✓ | ✓ | ✓ |
| Lettres déjà posées sautées pendant la saisie | ✓ | ✓ | ✓ | ✓ |
| Grille difficile 7 × 10 (niveau 30) entièrement visible, sans défilement | ✓ | ✓ | ✓ | ✓ |
| Même grille avec le réglage « Agrandir les grilles » : jouée jusqu'au bout, case active toujours visible | ✓ | ✓ | ✓ | ✓ |
| Défi du jour, statistiques, collection | ✓ | ✓ | ✓ | ✓ |
| Portrait de Serge Belmont sur l'accueil | ✓ | ✓ | ✓ | ✓ |
| Univers Serge Belmont : pochettes chargées, grille en treillis jouée jusqu'au bout, grille suivante | ✓ | ✓ | ✓ | ✓ |
| Réglages conservés ; progression effacée après confirmation | ✓ | ✓ | ✓ | ✓ |
| Sauvegarde abîmée : le jeu démarre | ✓ | ✓ | ✓ | ✓ |
| Clavier physique | — | — | — | ✓ |
| Manifeste, icônes, jeu disponible hors connexion | ✓ | — | — | ✓ |

« — » : non applicable ou non vérifié sur cet appareil simulé.

## Défaut trouvé par ces tests et corrigé

- **Dernière lettre perdue** : si la page était fermée ou rechargée dans l'instant suivant une frappe, la dernière lettre n'était pas sauvegardée. La sauvegarde est maintenant écrite au moment même de la frappe. Le test « reprise après rechargement » le vérifie.

Signalés par le joueur et corrigés : mots qui reviennent d'un niveau à l'autre (voir « Répétitions entre les niveaux ») ; TRI défini par « Classement » (remplacé par « Séparation des déchets »). La relecture qui a suivi a corrigé onze autres définitions approximatives ou ambiguës (IL et LE définis tous deux comme « masculin », MARS « Mois du printemps », SU « Appris »…).

Défauts trouvés lors des phases précédentes et corrigés : définitions illisibles sur les grandes grilles (zoom automatique ajouté), deux définitions qui donnaient la réponse d'un mot voisin, deux grilles trop semblables à leurs voisines (retirées).

## Tests échoués

Aucun à ce jour.

## Problèmes connus, non résolus

- **Thèmes** : 28 grilles du parcours sur 30 sont en culture générale. Pas de grilles cinéma, chanson ou histoire.
- **Univers Serge Belmont** : 6 petites grilles (6 à 10 mots) où la moitié environ des mots vient de l'univers ; le reste est du vocabulaire général. Les mots de plus de 9 lettres (PORQUEROLLES, MARIONNETTISTE, LAMPADAIRES, PHOTOGRAPHIE) et ACCORDÉON n'ont pas pu être placés. Ces grilles contiennent des cases noires.
- **Difficulté** : elle progresse par la taille, la longueur des mots et un vocabulaire un peu plus rare, pas par la subtilité des définitions. Aucune grille « expert ».
- **Univers Serge Belmont** : les règles anti-répétition ne s'appliquent qu'au parcours principal. Dans l'univers, un mot apparaît au plus deux fois (NUIT, OISEAU et ÉTÉS reviennent une fois).
- **Défi du jour** : il peut tomber sur une grille difficile dès le premier jour d'un nouveau joueur.
- **Lisibilité des définitions dans les cases** : la grille entière tient désormais à l'écran, sans défilement. Contrepartie : sur les grandes grilles, le texte des définitions dans les cases est très petit (environ 6 px sur un téléphone de 375 × 667). La définition du mot sélectionné s'affiche en grand sous la grille, et le réglage « Agrandir les grilles » rétablit de grandes cases avec défilement.
- **Hors connexion** : disponible seulement à partir de la deuxième visite.
- **Décor** : dessiné en formes simples ; seul le portrait vient des pochettes fournies.

## Ce qui n'a pas été testé

- **Un vrai téléphone.** Tous les tests mobiles sont faits sur des appareils simulés.
- **Le navigateur intégré de Facebook** et celui de Messenger.
- **Le partage** par le menu du téléphone et la copie automatique (seul l'affichage du texte à copier a été vérifié).
- **L'installation sur l'écran d'accueil** d'un vrai téléphone.
- **Les performances sur un téléphone de gamme moyenne.** Indication seulement : le premier chargement pèse environ 160 Ko compressés.
- **L'accessibilité** (lecteur d'écran, contrastes mesurés).
- **La justesse des définitions par un relecteur humain** : les 1 070 définitions n'ont été relues que par leur auteur.
- **Une série de plusieurs jours réels** : vérifiée par calcul uniquement.
- **Les classements** : non réalisés.
