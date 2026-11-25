// Répartit les musiques sur les niveaux du parcours : node outils/repartir-musiques.cjs
// Règles (vérifiées aussi par tests/musique.test.ts) :
// - Nuit Douce est la musique des menus ; elle sert aussi pour un seul niveau, pas au début du parcours.
// - Le style se lit dans le titre : « Nostalgie d'antan (3) » est du style « Nostalgie d'antan ».
//   Deux niveaux qui se suivent n'ont jamais le même style, et un style ne revient pas avant 3 niveaux.
// - « Soir d'été » et « Soirée de Paris » (deux ambiances de soirée) ne se suivent pas non plus.
// - Il y a moins de morceaux que de niveaux : quelques morceaux reviennent, le plus loin possible.
// Résultat : donnees/musiques.json
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const NIVEAUX = fs.readdirSync(path.join(racine, 'grilles')).filter((f) => /^\d+\.json$/.test(f)).map((f) => f.replace('.json', '')).sort();
const MENU = 'nuit-douce';
// Morceaux joués deux fois (26 morceaux pour 30 niveaux).
const EN_DOUBLE = ['soir-d-ete', 'soiree-de-paris', 'clavier-et-cordes-2', 'april-sur-l-ile-3'];
const TITRES = {
  'april-sur-l-ile': "April sur l'île", 'clavier-et-cordes': 'Clavier et cordes', 'nostalgie-d-antan': "Nostalgie d'antan",
  'nuit-douce': 'Nuit Douce', 'rue-de-la-pluie': 'Rue de la Pluie', 'soir-d-ete': "Soir d'été", 'soiree-de-paris': 'Soirée de Paris',
};
const AMBIANCE = { 'soir-d-ete': 'soiree', 'soiree-de-paris': 'soiree' };

const pistes = fs.readdirSync(path.join(racine, 'public', 'musique')).filter((f) => f.endsWith('.mp3')).map((f) => f.replace('.mp3', '')).sort();
const style = (p) => p.replace(/-\d+$/, '');
const ambiance = (s) => AMBIANCE[s] ?? s;
const titre = (p) => `${TITRES[style(p)]}${/-(\d+)$/.test(p) ? ` (${p.match(/-(\d+)$/)[1]})` : ''}`;

// Morceaux de chaque style ; un morceau en double est placé en premier et en dernier de son style.
const parStyle = new Map();
for (const p of pistes) parStyle.set(style(p), [...(parStyle.get(style(p)) ?? []), p]);
for (const [s, l] of parStyle) {
  const doubles = l.filter((p) => EN_DOUBLE.includes(p));
  parStyle.set(s, [...doubles, ...l.filter((p) => !doubles.includes(p)), ...doubles]);
}
const total = NIVEAUX.length;
if ([...parStyle.values()].flat().length !== total) throw new Error('Nombre de morceaux différent du nombre de niveaux');

// Recherche d'un ordre des styles qui respecte toutes les règles. À chaque niveau, on essaie d'abord
// le style qui a le plus de morceaux restants (cela répartit chaque style régulièrement).
const restants = new Map([...parStyle].map(([s, l]) => [s, l.length]));
const ordre = [];
const permis = (s, i) =>
  (s !== MENU || i >= 4) &&
  (i === 0 || ambiance(ordre[i - 1]) !== ambiance(s)) &&
  !ordre.slice(Math.max(0, i - 2), i).includes(s);
const chercher = (i) => {
  if (i === total) return true;
  // Position « idéale » de la prochaine apparition de chaque style s'il était réparti régulièrement :
  // on choisit d'abord le style le plus en retard sur cette position.
  const ideale = (s) => {
    const n = parStyle.get(s).length;
    return ((n - restants.get(s) + 0.5) * total) / n;
  };
  const candidats = [...restants.keys()].filter((s) => restants.get(s) > 0 && permis(s, i)).sort((a, b) => ideale(a) - ideale(b) || a.localeCompare(b));
  for (const s of candidats) {
    ordre.push(s);
    restants.set(s, restants.get(s) - 1);
    if (chercher(i + 1)) return true;
    ordre.pop();
    restants.set(s, restants.get(s) + 1);
  }
  return false;
};
if (!chercher(0)) throw new Error('Aucune répartition ne respecte les règles');

const niveaux = {};
const reste = new Map([...parStyle].map(([s, l]) => [s, [...l]]));
ordre.forEach((s, i) => (niveaux[NIVEAUX[i]] = reste.get(s).shift()));
fs.writeFileSync(
  path.join(racine, 'donnees', 'musiques.json'),
  JSON.stringify({ menu: MENU, titres: Object.fromEntries(pistes.map((p) => [p, titre(p)])), niveaux }, null, 2) + '\n',
);
for (const [n, p] of Object.entries(niveaux)) console.log(`${n}  ${titre(p)}`);
