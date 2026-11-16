// Validateur de grilles.
// Indépendant du moteur de jeu et de l'affichage : il relit les données brutes
// d'une grille et recalcule tout lui-même. Même entrée = même rapport, toujours.

export interface Probleme {
  code: string;
  message: string;
}

export interface Rapport {
  id: string;
  valide: boolean; // vrai seulement s'il n'y a aucune erreur bloquante
  erreurs: Probleme[];
  avertissements: Probleme[];
}

export interface Options {
  /** Mots français en minuscules, avec accents. Sans dictionnaire, l'orthographe n'est pas contrôlée. */
  dictionnaire?: ReadonlySet<string>;
  /** Noms propres autorisés, écrits comme dans « affichage » (ex. PARIS). */
  nomsPropres?: ReadonlySet<string>;
}

export const DIFFICULTES = ['facile', 'intermediaire', 'difficile', 'expert'];

const DEPARTS: Record<string, { dl: number; dc: number; sens: 'H' | 'V' }> = {
  droite: { dl: 0, dc: 1, sens: 'H' },
  bas: { dl: 1, dc: 0, sens: 'V' },
  'droite-puis-bas': { dl: 0, dc: 1, sens: 'V' },
  'bas-puis-droite': { dl: 1, dc: 0, sens: 'H' },
};

/** Convention des cases : majuscules, sans accents, sans espace ni tiret (ÎLE → ILE, CŒUR → COEUR). */
export function normaliser(s: string): string {
  return s
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

const estEntier = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const estTexte = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;

interface MotPlace {
  n: number; // numéro du mot (à partir de 1)
  nom: string;
  reponse: string;
  affichage: string;
  definition: string;
  fleche: string;
  sens: 'H' | 'V';
  caseDef: number;
  cases: number[];
}

export function validerGrille(brut: unknown, opt: Options = {}): Rapport {
  const erreurs: Probleme[] = [];
  const avertissements: Probleme[] = [];
  const err = (code: string, message: string) => void erreurs.push({ code, message });
  const avert = (code: string, message: string) => void avertissements.push({ code, message });
  const g = (brut ?? {}) as Record<string, unknown>;
  const id = estTexte(g.id) ? g.id : '?';
  const fin = (): Rapport => ({ id, valide: erreurs.length === 0, erreurs, avertissements });

  // ---- 1. Format général ----
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    err('E-FORMAT', 'le fichier ne contient pas une grille');
    return fin();
  }
  if (!estTexte(g.id)) err('E-FORMAT', 'champ « id » manquant');
  if (!estTexte(g.titre)) err('E-FORMAT', 'champ « titre » manquant');
  if (!estTexte(g.theme)) err('E-FORMAT', 'champ « theme » manquant');
  if (!DIFFICULTES.includes(g.difficulte as string))
    err('E-FORMAT', `difficulté inconnue « ${String(g.difficulte)} » (attendu : ${DIFFICULTES.join(', ')})`);
  const L = g.largeur as number;
  const H = g.hauteur as number;
  const dimsOk = estEntier(L) && estEntier(H) && L >= 2 && H >= 2 && L <= 30 && H <= 30;
  if (!dimsOk) err('E-FORMAT', 'largeur ou hauteur invalide (entiers entre 2 et 30)');
  if (!Array.isArray(g.mots) || g.mots.length === 0) err('E-FORMAT', 'la liste « mots » est vide ou manquante');
  if (!dimsOk || !Array.isArray(g.mots) || g.mots.length === 0) return fin();

  const dedans = (l: number, c: number) => l >= 0 && c >= 0 && l < H && c < L;
  const pos = (k: number) => `ligne ${Math.floor(k / L) + 1}, colonne ${(k % L) + 1}`;

  // ---- 2. Chaque mot : format, caractères, orthographe, placement ----
  const places: MotPlace[] = [];
  const lettres = new Map<number, { lettre: string; mots: MotPlace[] }>();
  const defs = new Map<number, MotPlace[]>();

  (g.mots as unknown[]).forEach((mb, i) => {
    const m = (mb ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const nom = `mot ${n} « ${typeof m.reponse === 'string' ? m.reponse : '?'} »`;
    let ok = true;

    const cd = m.caseDefinition;
    if (!Array.isArray(cd) || cd.length !== 2 || !estEntier(cd[0]) || !estEntier(cd[1])) {
      err('E-FORMAT', `${nom} : « caseDefinition » doit être [ligne, colonne]`);
      ok = false;
    }
    const dep = DEPARTS[m.fleche as string];
    if (!dep) {
      err('E-FLECHE', `${nom} : flèche inconnue « ${String(m.fleche)} »`);
      ok = false;
    }
    if (!estTexte(m.definition)) err('E-DEFINITION', `${nom} : définition vide`);
    if (typeof m.reponse !== 'string' || !/^[A-Z]{2,}$/.test(m.reponse)) {
      err('E-CARACTERES', `${nom} : la réponse doit contenir au moins 2 lettres, uniquement de A à Z, en majuscules sans accents`);
      ok = false;
    }
    if (!estTexte(m.affichage)) {
      err('E-AFFICHAGE', `${nom} : champ « affichage » manquant`);
    } else if (typeof m.reponse === 'string') {
      if (normaliser(m.affichage) !== m.reponse)
        err('E-AFFICHAGE', `${nom} : « affichage » (${m.affichage}) ne correspond pas à la réponse une fois les accents retirés`);
      else if (opt.dictionnaire) {
        const forme = m.affichage.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
        if (!opt.dictionnaire.has(forme) && !opt.nomsPropres?.has(m.affichage))
          err('E-DICTIONNAIRE', `${nom} : « ${m.affichage} » est absent du dictionnaire (orthographe ou accents à vérifier) et de la liste des noms propres`);
      }
    }
    if (!ok) return;

    const [l0, c0] = cd as [number, number];
    if (!dedans(l0, c0)) {
      err('E-HORS-GRILLE', `${nom} : case de définition hors de la grille`);
      return;
    }
    const reponse = m.reponse as string;
    const mot: MotPlace = {
      n,
      nom,
      reponse,
      affichage: String(m.affichage ?? reponse),
      definition: String(m.definition ?? ''),
      fleche: m.fleche as string,
      sens: dep.sens,
      caseDef: l0 * L + c0,
      cases: [],
    };
    for (let j = 0; j < reponse.length; j++) {
      const l = l0 + dep.dl + (dep.sens === 'V' ? j : 0);
      const c = c0 + dep.dc + (dep.sens === 'H' ? j : 0);
      if (!dedans(l, c)) {
        err('E-HORS-GRILLE', `${nom} : la réponse sort de la grille (${reponse.length} lettres, ${j} cases disponibles)`);
        return;
      }
      mot.cases.push(l * L + c);
    }
    places.push(mot);
    defs.set(mot.caseDef, [...(defs.get(mot.caseDef) ?? []), mot]);
    mot.cases.forEach((k, j) => {
      const deja = lettres.get(k);
      if (!deja) lettres.set(k, { lettre: reponse[j], mots: [mot] });
      else {
        if (deja.lettre !== reponse[j])
          err('E-CROISEMENT', `conflit de lettres au croisement (${pos(k)}) : ${deja.mots[0].nom} donne ${deja.lettre}, ${nom} donne ${reponse[j]}`);
        deja.mots.push(mot);
      }
    });
  });

  // ---- 3. Cases utilisées de façon incohérente ----
  for (const [k, liste] of defs) {
    const l = lettres.get(k);
    if (l) err('E-CASE-MIXTE', `la case (${pos(k)}) sert à la fois de définition (${liste[0].nom}) et de lettre (${l.mots[0].nom})`);
    if (liste.length > 2) err('E-DEF-TROP', `la case (${pos(k)}) contient ${liste.length} définitions (2 au maximum)`);
    const fleches = liste.map((m) => m.fleche);
    if (new Set(fleches).size !== fleches.length) err('E-DEF-TROP', `la case (${pos(k)}) contient deux définitions avec la même flèche`);
  }

  // ---- 4. Suites de lettres : chacune doit être exactement un mot défini ----
  const estLettre = (l: number, c: number) => dedans(l, c) && lettres.has(l * L + c);
  const couvert = new Map<string, MotPlace[]>();
  for (const m of places) {
    const pas = m.sens === 'H' ? 1 : L;
    const dl = m.sens === 'V' ? 1 : 0;
    const dc = m.sens === 'H' ? 1 : 0;
    let l = Math.floor(m.cases[0] / L);
    let c = m.cases[0] % L;
    while (estLettre(l - dl, c - dc)) {
      l -= dl;
      c -= dc;
    }
    const debut = l * L + c;
    let longueur = 0;
    while (estLettre(l, c)) {
      longueur++;
      l += dl;
      c += dc;
    }
    if (debut !== m.cases[0] || longueur !== m.cases.length)
      err('E-LONGUEUR', `${m.nom} : longueur de réponse incorrecte (${m.cases.length} lettres pour un emplacement de ${longueur} cases)`);
    const cle = `${m.sens}:${debut}:${pas}`;
    couvert.set(cle, [...(couvert.get(cle) ?? []), m]);
  }
  for (const [, liste] of couvert)
    if (liste.length > 1) err('E-EMPLACEMENT-DOUBLE', `${liste.map((m) => m.nom).join(' et ')} occupent le même emplacement`);

  for (const sens of ['H', 'V'] as const) {
    const dl = sens === 'V' ? 1 : 0;
    const dc = sens === 'H' ? 1 : 0;
    for (let l = 0; l < H; l++)
      for (let c = 0; c < L; c++) {
        if (!estLettre(l, c) || estLettre(l - dl, c - dc) || !estLettre(l + dl, c + dc)) continue;
        const cle = `${sens}:${l * L + c}:${sens === 'H' ? 1 : L}`;
        if (couvert.has(cle)) continue;
        let suite = '';
        for (let a = l, b = c; estLettre(a, b); a += dl, b += dc) suite += lettres.get(a * L + b)!.lettre;
        err('E-MOT-SANS-DEFINITION', `les lettres ${suite} forment un mot ${sens === 'H' ? 'horizontal' : 'vertical'} sans définition (${pos(l * L + c)})`);
      }
  }

  // ---- 5. Contenu : doublons ----
  const vus = new Map<string, MotPlace>();
  for (const m of places) {
    const autre = vus.get(m.reponse);
    if (autre) err('E-REPONSE-DOUBLE', `la réponse ${m.reponse} apparaît deux fois (mots ${autre.n} et ${m.n})`);
    else vus.set(m.reponse, m);
  }

  // ---- 6. Avertissements (à relire, non bloquants) ----
  const defsVues = new Map<string, MotPlace>();
  for (const m of places) {
    const cle = normaliser(m.definition);
    const autre = defsVues.get(cle);
    if (autre && cle) avert('A-DEFINITION-DOUBLE', `les mots ${autre.n} et ${m.n} ont la même définition « ${m.definition} »`);
    else defsVues.set(cle, m);
    if (m.reponse.length >= 3 && cle.includes(m.reponse))
      avert('A-REPONSE-DANS-DEFINITION', `${m.nom} : la réponse figure dans sa définition « ${m.definition} »`);
    const limite = (defs.get(m.caseDef)?.length ?? 1) > 1 ? 24 : 36;
    if (m.definition.length > limite)
      avert('A-DEFINITION-LONGUE', `${m.nom} : définition de ${m.definition.length} caractères (au-delà de ${limite}, elle sera difficile à lire dans la case)`);
    if (m.cases.every((k) => lettres.get(k)!.mots.length === 1)) avert('A-SANS-CROISEMENT', `${m.nom} ne croise aucun autre mot`);
    // Une définition ne doit pas donner la réponse d'un autre mot de la grille.
    for (const autre of places)
      if (autre !== m && autre.reponse.length >= 3 && m.definition.split(/[^\p{L}]+/u).some((mot) => mot.toLowerCase() === autre.affichage.toLowerCase()))
        avert('A-REPONSE-DANS-AUTRE-DEFINITION', `la définition « ${m.definition} » (${m.nom}) contient la réponse ${autre.reponse} d'un autre mot`);
  }
  const vides = L * H - lettres.size - defs.size;
  const noiresPrevues = g.casesNoires === undefined ? 0 : (g.casesNoires as number);
  if (g.casesNoires !== undefined && !(estEntier(g.casesNoires) && g.casesNoires >= 0)) err('E-FORMAT', '« casesNoires » doit être un nombre entier positif');
  else if (vides !== noiresPrevues)
    avert('A-CASES-VIDES', `${vides} case(s) sans lettre ni définition, alors que la grille en déclare ${noiresPrevues} (champ « casesNoires »)`);

  return fin();
}
