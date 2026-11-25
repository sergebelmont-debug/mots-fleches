// Commande : npm run verifier            → vérifie toutes les grilles de grilles/
//            npm run verifier -- dossier  → vérifie les grilles d'un autre dossier
// Se termine en échec (code 1) si une seule grille contient une erreur bloquante,
// ou si les grilles du parcours principal répètent trop les mêmes mots.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { problemesRepetition } from '../src/validation/repetitions.ts';
import { validerGrille, type Rapport } from '../src/validation/valider.ts';
import { chargerDictionnaire } from './dictionnaire.ts';

const dossier = process.argv[2] ?? 'grilles';
const options = chargerDictionnaire();
// Tous les fichiers .json du dossier et de ses sous-dossiers (ex. grilles/serge-belmont/).
const lister = (d: string, prefixe = ''): string[] =>
  readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? lister(join(d, e.name), `${prefixe}${e.name}/`) : e.name.endsWith('.json') ? [`${prefixe}${e.name}`] : []))
    .sort();
const fichiers = lister(dossier);
const ids = new Map<string, string>();
const lisibles: { id: string; mots: { reponse: string }[]; principal: boolean }[] = [];
let invalides = 0;
let avertissements = 0;

for (const f of fichiers) {
  let rapport: Rapport;
  try {
    const donnees = JSON.parse(readFileSync(join(dossier, f), 'utf8'));
    rapport = validerGrille(donnees, options);
    if (Array.isArray(donnees?.mots)) lisibles.push({ id: String(donnees.id), mots: donnees.mots, principal: !f.includes('/') });
  } catch (e) {
    rapport = { id: f, valide: false, avertissements: [], erreurs: [{ code: 'E-FORMAT', message: `fichier illisible (${(e as Error).message})` }] };
  }
  if (rapport.valide && `${rapport.id}.json` !== f.split('/').pop())
    rapport.erreurs.push({ code: 'E-FORMAT', message: `le fichier ${f} devrait s'appeler ${rapport.id}.json` });
  if (ids.has(rapport.id)) rapport.erreurs.push({ code: 'E-FORMAT', message: `identifiant déjà utilisé par ${ids.get(rapport.id)}` });
  ids.set(rapport.id, f);

  const nom = `Grille ${f.replace(/\.json$/, '')}`;
  if (rapport.erreurs.length === 0) console.log(`${nom} : VALIDÉE`);
  else {
    invalides++;
    for (const e of rapport.erreurs) console.log(`${nom} : ERREUR — ${e.message} [${e.code}]`);
  }
  for (const a of rapport.avertissements) {
    avertissements++;
    console.log(`    à relire — ${a.message} [${a.code}]`);
  }
}

// Répétitions de mots entre les niveaux du parcours principal (règles : src/validation/repetitions.ts).
const principal = lisibles.filter((g) => g.principal);
const repetitions = principal.length > 1 ? problemesRepetition(principal) : [];
if (principal.length > 1) {
  console.log('');
  if (repetitions.length === 0) console.log('Répétitions entre les niveaux : AUCUN PROBLÈME');
  for (const r of repetitions) console.log(`Répétitions : ERREUR — ${r}`);
}

console.log('');
console.log(
  `${fichiers.length} grille(s) vérifiée(s) : ${fichiers.length - invalides} validée(s), ${invalides} refusée(s), ` +
    `${repetitions.length} problème(s) de répétition, ${avertissements} avertissement(s).`,
);
if (fichiers.length === 0) console.log(`Aucune grille trouvée dans « ${dossier} ».`);
process.exit(invalides > 0 || repetitions.length > 0 || fichiers.length === 0 ? 1 : 0);
