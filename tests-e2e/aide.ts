import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { construireGrille, type DonneesGrille, type Grille } from '../src/engine/grille';

export const CLE = 'mots-fleches:v1';

export const GRILLES: Grille[] = readdirSync('grilles')
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => construireGrille(JSON.parse(readFileSync(join('grilles', f), 'utf8')) as DonneesGrille).grille);

export const grille = (id: string) => GRILLES.find((g) => g.id === id)!;
export const idMot = (g: Grille, reponse: string) => g.mots.findIndex((m) => m.reponse === reponse);

export const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true });
export const taper = async (page: Page, texte: string) => {
  for (const l of texte) await page.locator('.touche', { hasText: new RegExp(`^${l}$`) }).click();
};

/** Remplit toutes les cases encore vides ou fausses, une par une, comme un joueur. */
export async function resoudre(page: Page, g: Grille) {
  const cases = page.locator('.case.lettre');
  const textes = await cases.allTextContents();
  const indexDom = g.cases.map((c, k) => (c.type === 'lettre' ? k : -1)).filter((k) => k >= 0);
  for (let i = 0; i < indexDom.length; i++) {
    const k = indexDom[i];
    const c = g.cases[k];
    if (c.type !== 'lettre' || textes[i] === c.lettre) continue;
    await page.locator(`[data-case="${k}"]`).click();
    await taper(page, c.lettre);
  }
}

/** Démarre avec une sauvegarde donnée (par exemple : tous les niveaux débloqués). */
export async function avecSauvegarde(page: Page, terminees: string[]) {
  const sauvegarde = {
    version: 1,
    progression: { terminees: Object.fromEntries(terminees.map((id) => [id, { etoiles: 3, indices: 0, secondes: 200 }])) },
    enCours: {},
    reglages: { signalerMotsJustes: true },
  };
  await page.addInitScript(([cle, valeur]) => localStorage.setItem(cle, valeur), [CLE, JSON.stringify(sauvegarde)]);
}

/** Relève les erreurs JavaScript de la page ; à vérifier en fin de test. */
export function surveiller(page: Page): string[] {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
  return erreurs;
}

export const victoire = (page: Page) => page.locator('.victoire .carte');
export const attendreJeu = (page: Page) => expect(page.locator('.grille')).toBeVisible();
