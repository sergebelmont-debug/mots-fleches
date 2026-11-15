// Commande : npm run verifier            → vérifie toutes les grilles de grilles/
//            npm run verifier -- dossier  → vérifie les grilles d'un autre dossier
// Se termine en échec (code 1) si une seule grille contient une erreur bloquante.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validerGrille, type Rapport } from '../src/validation/valider.ts';
import { chargerDictionnaire } from './dictionnaire.ts';

const dossier = process.argv[2] ?? 'grilles';
const options = chargerDictionnaire();
const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.json')).sort();
const ids = new Map<string, string>();
let invalides = 0;
let avertissements = 0;

for (const f of fichiers) {
  let rapport: Rapport;
  try {
    rapport = validerGrille(JSON.parse(readFileSync(join(dossier, f), 'utf8')), options);
  } catch (e) {
    rapport = { id: f, valide: false, avertissements: [], erreurs: [{ code: 'E-FORMAT', message: `fichier illisible (${(e as Error).message})` }] };
  }
  if (rapport.valide && `${rapport.id}.json` !== f)
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

console.log('');
console.log(`${fichiers.length} grille(s) vérifiée(s) : ${fichiers.length - invalides} validée(s), ${invalides} refusée(s), ${avertissements} avertissement(s).`);
if (fichiers.length === 0) console.log(`Aucune grille trouvée dans « ${dossier} ».`);
process.exit(invalides > 0 || fichiers.length === 0 ? 1 : 0);
