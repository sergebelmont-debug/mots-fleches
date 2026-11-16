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
const pasMax = Number(args.pas ?? 30000); // effort de recherche par essai
const univers = args.univers ?? ''; // ex. serge-belmont : lit donnees/univers/serge-belmont.txt
const imposes = (args.imposer ?? '').split(',').map((x) => x.trim()).filter(Boolean); // mots obligatoires
const dossier = args.dossier ? join('grilles', args.dossier) : 'grilles';
if (!id || !titre) {
  console.log('Usage : npm run generer -- --id 004 --titre "Titre" [--gabarit petit|moyen|grand] [--difficulte facile] [--theme nature] [--graine 7]');
  process.exit(1);
}
const fichier = join(racine, dossier, `${id}.json`);
if (existsSync(fichier) && args.remplacer !== 'oui') {
  console.log(`${dossier}/${id}.json existe déjà (ajouter --remplacer oui pour l'écraser).`);
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
for (const f of readdirSync(join(racine, dossier))) {
  if (!f.endsWith('.json') || f === `${id}.json`) continue;
  const g = JSON.parse(readFileSync(join(racine, dossier, f), 'utf8')) as { mots: { reponse: string }[] };
  for (const m of g.mots) usages.set(m.reponse, (usages.get(m.reponse) ?? 0) + 1);
}
const usageMax = (longueur: number) => (longueur <= 2 ? 6 : longueur === 3 ? 3 : 2);

const general = lireLexique();
const duMonde = new Set<string>();
let lexique = general.filter((e) => e.niveau <= niveauMax && (usages.get(e.reponse) ?? 0) < usageMax(e.reponse.length));
if (univers) {
  const definitions = new Map(general.map((e) => [e.reponse, e.definition]));
  const propres = lireLexique(join(racine, 'donnees', 'univers', `${univers}.txt`)).map((e) => ({ ...e, definition: e.definition || definitions.get(e.reponse) || '' }));
  const sansDefinition = propres.filter((e) => !e.definition);
  if (sansDefinition.length) {
    console.log(`Univers ${univers} : définition manquante pour ${sansDefinition.map((e) => e.affichage).join(', ')}`);
    process.exit(1);
  }
  for (const e of propres) duMonde.add(e.reponse);
  // Un mot de l'univers apparaît au plus 2 fois dans ses grilles, sauf s'il est imposé.
  const permis = propres.filter((e) => imposes.includes(e.reponse) || (usages.get(e.reponse) ?? 0) < 2);
  lexique = [...permis, ...lexique.filter((e) => !duMonde.has(e.reponse))];
}
const inconnus = imposes.filter((m) => !lexique.some((e) => e.reponse === m));
if (inconnus.length) {
  console.log(`Mots imposés absents du lexique : ${inconnus.join(', ')}`);
  process.exit(1);
}
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

for (let l = 0; l < H; l++)
  for (let c = 0; c < L; c++)
    if (gabarit[l][c] === 'D' && !charge.get(`${l},${c}`)) {
      console.log(`Gabarit inutilisable : la case de définition ligne ${l + 1}, colonne ${c + 1} ne sert à aucun mot.`);
      process.exit(1);
    }

// ---- Remplissage : on place toujours le mot le plus contraint en premier ----
const lettres: string[] = new Array(H * L).fill('');
const pris = new Set<string>();
const choisis = new Map<Emplacement, Entree>();
const candidats = (e: Emplacement) =>
  (parLongueur.get(e.cases.length) ?? []).filter((m) => !pris.has(m.reponse) && e.cases.every((k, i) => !lettres[k] || lettres[k] === m.reponse[i]));
// Ordre de préférence : mots du thème, puis mots les moins utilisés, puis hasard.
const rang = (m: Entree) => (duMonde.has(m.reponse) || (theme && m.theme === theme) ? 0 : 10) + (usages.get(m.reponse) ?? 0) * 2 + (m.niveau - 1);
let pas = 0;
const remplir = (restants: Emplacement[]): boolean => {
  if (restants.length === 0) return true;
  if (pas++ > pasMax) return false;
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

const entreesImposees = imposes.map((m) => lexique.find((e) => e.reponse === m)!);
let tentatives = 0;
const placerImposes = (i: number, libres: Emplacement[]): boolean => {
  if (i === entreesImposees.length) {
    if (tentatives++ >= essais) return false;
    pas = 0;
    return remplir(libres);
  }
  const m = entreesImposees[i];
  for (const e of melanger(libres.filter((x) => x.cases.length === m.reponse.length))) {
    if (!e.cases.every((k, j) => !lettres[k] || lettres[k] === m.reponse[j])) continue;
    const avant = e.cases.map((k) => lettres[k]);
    e.cases.forEach((k, j) => (lettres[k] = m.reponse[j]));
    pris.add(m.reponse);
    choisis.set(e, m);
    if (placerImposes(i + 1, libres.filter((x) => x !== e))) return true;
    pris.delete(m.reponse);
    choisis.delete(e);
    e.cases.forEach((k, j) => (lettres[k] = avant[j]));
    if (tentatives >= essais) return false;
  }
  return false;
};
// On recommence, avec un autre tirage, jusqu'à épuiser le nombre d'essais.
const estDuTheme = (m: Entree) => duMonde.has(m.reponse) || (!!theme && m.theme === theme);
const chercher = (): boolean => {
  let ok = false;
  tentatives = 0;
  while (!ok && tentatives < essais) {
    const avant = tentatives;
    lettres.fill('');
    pris.clear();
    choisis.clear();
    ok = placerImposes(0, melanger([...emplacements]));
    if (tentatives === avant) break; // aucun emplacement possible pour les mots imposés
  }
  return ok;
};
// Avec --meilleur N : on cherche N remplissages et on garde celui qui a le plus de mots du thème.
const tirages = Number(args.meilleur ?? 1);
let trouve = false;
let record = -1;
let gardeLettres: string[] = [];
let gardeChoix = new Map<Emplacement, Entree>();
for (let t = 0; t < tirages; t++) {
  if (!chercher()) continue;
  const score = [...choisis.values()].filter(estDuTheme).length;
  if (score > record) {
    record = score;
    gardeLettres = [...lettres];
    gardeChoix = new Map(choisis);
    trouve = true;
  }
}
if (trouve) {
  gardeLettres.forEach((x, k) => (lettres[k] = x));
  choisis.clear();
  for (const [e, m] of gardeChoix) choisis.set(e, m);
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
const noires = gabarit.join('').split('X').length - 1;
const grille = { id, titre, theme: univers || theme || 'culture-generale', difficulte, largeur: L, hauteur: H, ...(noires ? { casesNoires: noires } : {}), mots };
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
const duTheme = [...choisis.values()].filter((m) => duMonde.has(m.reponse) || (theme && m.theme === theme)).length;
const nomTheme = univers || theme;
console.log(`Grille ${id} « ${titre} » écrite : ${mots.length} mots${nomTheme ? `, dont ${duTheme} sur le thème « ${nomTheme} »` : ''}. À relire avant publication.`);
for (const a of rapport.avertissements) console.log(`    à relire — ${a.message}`);
