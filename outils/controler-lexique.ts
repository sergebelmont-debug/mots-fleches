// Commande : npm run lexique → contrôle donnees/lexique.txt (orthographe, doublons, longueur des définitions).
import { chargerDictionnaire } from './dictionnaire.ts';
import { controlerLexique, lireLexique } from './lexique.ts';

const { dictionnaire, nomsPropres } = chargerDictionnaire();
const entrees = lireLexique();
const pb = controlerLexique(entrees, dictionnaire, nomsPropres);
for (const p of pb) console.log('ERREUR — ' + p);
const parLongueur: Record<number, number> = {};
for (const e of entrees) parLongueur[e.reponse.length] = (parLongueur[e.reponse.length] ?? 0) + 1;
console.log(`${entrees.length} mots dans le lexique (${Object.entries(parLongueur).map(([l, n]) => `${n} de ${l} lettres`).join(', ')}).`);
console.log(pb.length === 0 ? 'Lexique : VALIDÉ' : `Lexique : ${pb.length} problème(s)`);
process.exit(pb.length === 0 ? 0 : 1);
