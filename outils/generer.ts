// Aide à la création de grilles : remplit un gabarit avec des mots du lexique.
//
//   npm run generer -- --id 004 --titre "Côté jardin" --gabarit petit --difficulte facile --theme nature
//
// Le résultat est proposé, jamais imposé : la grille est écrite dans grilles/ seulement
// si le validateur l'accepte, et elle doit ensuite être relue par un humain.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validerGrille } from '../src/validation/valider.ts';
import { chargerDictionnaire } from './dictionnaire.ts';
import { lireLexique, type Entree } from './lexique.ts';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- Options ----
const args: Record<string, string> = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1] ?? '';
const id = args.id;
const titre = args.titre;
const nomGabarit = args.gabarit ?? 'petit';
const difficulte = args.difficulte ?? 'facile';
const theme = args.theme ?? '';
const essais = Number(args.essais ?? 25);
if (!id || !titre) {
  console.log('Usage : npm run generer -- --id 004 --titre "Titre" [--gabarit petit|moyen|grand] [--difficulte facile] [--theme nature] [--graine 7]');
  process.exit(1);
}
const fichier = join(racine, 'grilles', `${id}.json`);
if (existsSync(fichier) && args.remplacer !== 'oui') {
  console.log(`grilles/${id}.json existe déjà (ajouter --remplacer oui pour l'écraser).`);
  process.exit(1);
}
const gabarits = JSON.parse(readFileSync(join(racine, 'donnees', 'gabarits.json'), 'utf8')) as Record<string, string[]>;
const gabarit = gabarits[nomGabarit];
if (!gabarit) {
  console.log(`Gabarit inconnu « ${nomGabarit} ». Disponibles : ${Object.keys(gabarits).join(', ')}`);
  process.exit(1);
}
const niveauMax = { facile: 2, intermediaire: 3, difficile: 3, expert: 3 }[difficulte] ?? 1;

// ---- Hasard reproductible : même graine = même grille ----
let etat = (Number(args.graine ?? id) || 1) >>> 0;
const hasard = () => {
  etat = (etat + 0x6d2b79f5) >>> 0;
  let t = etat;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const melanger = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- Mots déjà utilisés dans les autres grilles (pour limiter les répétitions) ----
const usages = new Map<string, number>();
for (const f of readdirSync(join(racine, 'grilles'))) {
  if (!f.endsWith('.json') || f === `${id}.json`) continue;
  const g = JSON.parse(readFileSync(join(racine, 'grilles', f), 'utf8')) as { mots: { reponse: string }[] };
  for (const m of g.mots) usages.set(m.reponse, (usages.get(m.reponse) ?? 0) + 1);
}
const usageMax = (longueur: number) => (longueur <= 2 ? 6 : longueur === 3 ? 3 : 2);

const lexique = lireLexique().filter((e) => e.niveau <= niveauMax && (usages.get(e.reponse) ?? 0) < usageMax(e.reponse.length));
const parLongueur = new Map<number, Entree[]>();
for (const e of lexique) parLongueur.set(e.reponse.length, [...(parLongueur.get(e.reponse.length) ?? []), e]);

// ---- Emplacements du gabarit ----
const H = gabarit.length;
const L = gabarit[0].length;
const estL = (l: number, c: number) => l >= 0 && c >= 0 && l < H && c < L && gabarit[l][c] === 'L';
const estD = (l: number, c: number) => l >= 0 && c >= 0 && l < H && c < L && gabarit[l][c] === 'D';
interface Emplacement {
  sens: 'H' | 'V';
  l: number;
  c: number;
  cases: number[];
}
const emplacements: Emplacement[] = [];
for (let l = 0; l < H; l++)
  for (let c = 0; c < L; c++) {
    if (!estL(l, c)) continue;
    if (!estL(l, c - 1) && estL(l, c + 1)) {
      const cases: number[] = [];
      for (let k = c; estL(l, k); k++) cases.push(l * L + k);
      emplacements.push({ sens: 'H', l, c, cases });
    }
    if (!estL(l - 1, c) && estL(l + 1, c)) {
      const cases: number[] = [];
      for (let k = l; estL(k, c); k++) cases.push(k * L + c);
      emplacements.push({ sens: 'V', l, c, cases });
    }
  }

// ---- Chaque mot doit avoir une case de définition voisine (2 définitions max par case) ----
type Choix = [number, number, string];
const options: Choix[][] = emplacements.map((e) =>
  (e.sens === 'H'
    ? ([[e.l, e.c - 1, 'droite'], [e.l - 1, e.c, 'bas-puis-droite']] as Choix[])
    : ([[e.l - 1, e.c, 'bas'], [e.l, e.c - 1, 'droite-puis-bas']] as Choix[])
  ).filter((o) => estD(o[0], o[1])),
);
const charge = new Map<string, number>();
const affectation: Choix[] = [];
const affecter = (i: number): boolean => {
  if (i === emplacements.length) return true;
  for (const o of options[i]) {
    const k = `${o[0]},${o[1]}`;
    if ((charge.get(k) ?? 0) >= 2) continue;
    charge.set(k, (charge.get(k) ?? 0) + 1);
    affectation[i] = o;
    if (affecter(i + 1)) return true;
    charge.set(k, charge.get(k)! - 1);
  }
  return false;
};
if (!affecter(0)) {
  console.log('Gabarit inutilisable : un mot n’a pas de case de définition disponible.');
  process.exit(1);
}

// ---- Remplissage : on place toujours le mot le plus contraint en premier ----
const lettres: string[] = new Array(H * L).fill('');
const pris = new Set<string>();
const choisis = new Map<Emplacement, Entree>();
const candidats = (e: Emplacement) =>
  (parLongueur.get(e.cases.length) ?? []).filter((m) => !pris.has(m.reponse) && e.cases.every((k, i) => !lettres[k] || lettres[k] === m.reponse[i]));
// Ordre de préférence : mots du thème, puis mots les moins utilisés, puis hasard.
const rang = (m: Entree) => (theme && m.theme === theme ? 0 : 10) + (usages.get(m.reponse) ?? 0) * 2 + (m.niveau - 1);
let pas = 0;
const remplir = (restants: Emplacement[]): boolean => {
  if (restants.length === 0) return true;
  if (pas++ > 30000) return false;
  let meilleur: Emplacement | null = null;
  let liste: Entree[] = [];
  for (const e of restants) {
    const c = candidats(e);
    if (c.length === 0) return false;
    if (!meilleur || c.length < liste.length) {
      meilleur = e;
      liste = c;
    }
  }
  const suite = restants.filter((e) => e !== meilleur);
  const ordre = melanger(liste).sort((a, b) => rang(a) - rang(b));
  for (const m of ordre) {
    const avant = meilleur!.cases.map((k) => lettres[k]);
    meilleur!.cases.forEach((k, i) => (lettres[k] = m.reponse[i]));
    pris.add(m.reponse);
    choisis.set(meilleur!, m);
    if (remplir(suite)) return true;
    pris.delete(m.reponse);
    choisis.delete(meilleur!);
    meilleur!.cases.forEach((k, i) => (lettres[k] = avant[i]));
  }
  return false;
};

let trouve = false;
for (let t = 0; t < essais && !trouve; t++) {
  pas = 0;
  lettres.fill('');
  pris.clear();
  choisis.clear();
  // Les grands mots d'abord dans l'ordre de départ, mélangés entre eux à chaque essai.
  trouve = remplir(melanger([...emplacements]));
}
if (!trouve) {
  console.log(`Aucun remplissage trouvé pour ${id} (gabarit ${nomGabarit}) après ${essais} essais. Essayer une autre --graine, ou enrichir le lexique.`);
  process.exit(1);
}

// ---- Écriture, seulement si le validateur accepte la grille ----
const mots = emplacements.map((e, i) => {
  const m = choisis.get(e)!;
  return { caseDefinition: [affectation[i][0], affectation[i][1]], fleche: affectation[i][2], definition: m.definition, reponse: m.reponse, affichage: m.affichage };
});
const grille = { id, titre, theme: theme || 'culture-generale', difficulte, largeur: L, hauteur: H, mots };
const rapport = validerGrille(grille, chargerDictionnaire());
for (let l = 0; l < H; l++) console.log('  ' + [...gabarit[l]].map((x, c) => (x === 'D' ? '#' : lettres[l * L + c])).join(' '));
if (!rapport.valide) {
  for (const e of rapport.erreurs) console.log(`REFUSÉE — ${e.message}`);
  process.exit(1);
}
const lignes = mots.map((m) => '    ' + JSON.stringify(m).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }'));
const { mots: _mots, ...tete } = grille;
void _mots;
writeFileSync(fichier, JSON.stringify(tete, null, 2).replace(/\n\}$/, ',\n  "mots": [\n' + lignes.join(',\n') + '\n  ]\n}\n'));
const duTheme = [...choisis.values()].filter((m) => theme && m.theme === theme).length;
console.log(`Grille ${id} « ${titre} » écrite : ${mots.length} mots${theme ? `, dont ${duTheme} sur le thème « ${theme} »` : ''}. À relire avant publication.`);
for (const a of rapport.avertissements) console.log(`    à relire — ${a.message}`);
