// Commande : npm run alterner
// Pour chaque petit mot qui a plusieurs définitions dans le lexique, fait alterner ses
// définitions d'un niveau à l'autre du parcours (A, B, A, B…), afin qu'un mot qui revient
// ne revienne pas avec la même définition. Une définition qui provoquerait un avertissement
// dans sa grille est remplacée par une autre. Les grilles restent validées.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validerGrille } from '../src/validation/valider.ts';
import { chargerDictionnaire } from './dictionnaire.ts';
import { lireLexique } from './lexique.ts';

interface Mot {
  reponse: string;
  definition: string;
}
const dossier = 'grilles';
const options = chargerDictionnaire();
const alternatives = new Map(lireLexique().filter((e) => e.definitions.length > 1).map((e) => [e.reponse, e.definitions]));
const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.json')).sort();
const grilles = fichiers.map((f) => ({ f, texte: readFileSync(join(dossier, f), 'utf8') })).map((x) => ({ ...x, d: JSON.parse(x.texte) as { mots: Mot[] } }));

let changements = 0;
for (const [mot, defs] of alternatives) {
  const emplois = grilles.flatMap((g) => g.d.mots.filter((m) => m.reponse === mot && defs.includes(m.definition)).map((m) => ({ g, m })));
  let precedente = '';
  emplois.forEach(({ g, m }, i) => {
    // On part de la définition « suivante » dans le cycle, puis on essaie les autres si besoin.
    const ordre = [...defs.slice(i % defs.length), ...defs.slice(0, i % defs.length)].sort((a, b) => Number(a === precedente) - Number(b === precedente));
    const origine = m.definition;
    for (const d of ordre) {
      m.definition = d;
      if (validerGrille(g.d, options).avertissements.length === 0) break;
      m.definition = origine;
    }
    if (m.definition !== origine) changements++;
    precedente = m.definition;
  });
}

for (const g of grilles) {
  // On ne remplace que le texte des définitions, pour garder la mise en forme du fichier.
  let texte = g.texte;
  const avant = JSON.parse(g.texte) as { mots: Mot[] };
  avant.mots.forEach((m, i) => {
    const nouvelle = g.d.mots[i].definition;
    if (nouvelle !== m.definition) {
      const ancienFragment = `"definition": ${JSON.stringify(m.definition)}, "reponse": ${JSON.stringify(m.reponse)}`;
      texte = texte.replace(ancienFragment, `"definition": ${JSON.stringify(nouvelle)}, "reponse": ${JSON.stringify(m.reponse)}`);
    }
  });
  if (texte !== g.texte) writeFileSync(join(dossier, g.f), texte);
}
console.log(`${changements} définition(s) de petits mots modifiée(s) pour alterner d'un niveau à l'autre.`);
