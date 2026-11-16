import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { construireGrille, type DonneesGrille } from '../src/engine/grille';
import { attendreJeu, resoudre, surveiller, victoire } from './aide';

const DOSSIER = 'grilles/serge-belmont';
const BELMONT = readdirSync(DOSSIER)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => construireGrille(JSON.parse(readFileSync(join(DOSSIER, f), 'utf8')) as DonneesGrille).grille);

const imagesChargees = (page: import('@playwright/test').Page, selecteur: string) =>
  page.locator(selecteur).evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));

test('accueil : le portrait de Serge Belmont s’affiche', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.portrait')).toBeVisible();
  await expect.poll(() => imagesChargees(page, '.portrait')).toEqual([true]);
  await expect(page.locator('.univers')).toContainText(`0/${BELMONT.length} grilles`);
});

test('univers Serge Belmont : pochettes, grille en treillis jouée jusqu’au bout, grille suivante', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await page.locator('.univers').click();
  await expect(page.locator('.barre-titre')).toHaveText('Serge Belmont');
  await expect(page.locator('.pastille')).toHaveCount(BELMONT.length);
  await expect(page.locator('.pastille:not([disabled])')).toHaveCount(1);
  await page.locator('.chemin-zone').evaluate((z) => z.scrollTo(0, z.scrollHeight)); // fait charger toutes les pochettes
  await expect.poll(() => imagesChargees(page, '.pastille img')).toEqual(BELMONT.map(() => true));

  const g = BELMONT[0];
  await page.locator(`[data-niveau="${g.id}"]`).click();
  await attendreJeu(page);
  await expect(page.locator('.barre-titre')).toContainText('Serge Belmont 1');
  await expect(page.locator('.case.vide')).toHaveCount(g.cases.filter((c) => c.type === 'vide').length);
  await resoudre(page, g);
  await expect(victoire(page)).toContainText('Serge Belmont 1 terminé');
  await page.getByRole('button', { name: 'Grille suivante', exact: true }).click();
  await expect(page.locator('.barre-titre')).toContainText('Serge Belmont 2');
  await page.locator('.barre').getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.locator('.barre-titre')).toHaveText('Serge Belmont');
  await expect(page.locator(`[data-niveau="${BELMONT[1].id}"]`)).toBeEnabled();
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();
  await expect(page.locator('.univers')).toContainText(`1/${BELMONT.length} grilles`);
  await expect(page.locator('.compteur').first()).toContainText('0/30'); // le parcours principal n'est pas modifié
  expect(erreurs).toEqual([]);
});
