import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { bouton, attendreJeu, surveiller } from './aide';

const MUSIQUES = JSON.parse(readFileSync('donnees/musiques.json', 'utf8')) as { menu: string; niveaux: Record<string, string> };

/** État des deux lecteurs audio de la page. */
const etat = (page: Page) =>
  page.evaluate(() => {
    const lire = (role: string) => {
      const a = document.querySelector<HTMLAudioElement>(`audio[data-musique="${role}"]`);
      return a ? { src: a.src.split('/').pop() ?? '', joue: !a.paused, temps: a.currentTime } : null;
    };
    return { menu: lire('menu'), niveau: lire('niveau') };
  });

test.describe('musique', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'lecture audio vérifiée sous Chrome');
  });

  test('Nuit Douce continue d’un menu à l’autre ; chaque niveau a sa musique depuis le début', async ({ page }) => {
    const erreurs = surveiller(page);
    await page.goto('/');
    await page.locator('.titre-jeu').click(); // premier geste : le navigateur autorise le son
    await expect.poll(async () => (await etat(page)).menu).toMatchObject({ src: `${MUSIQUES.menu}.mp3`, joue: true });
    await expect.poll(async () => (await etat(page)).menu!.temps).toBeGreaterThan(1);

    // Accueil → Parcours : même musique, pas de retour au début.
    const avant = (await etat(page)).menu!.temps;
    await bouton(page, 'Parcours').click();
    const apres = (await etat(page)).menu!;
    expect(apres.joue).toBe(true);
    expect(apres.temps).toBeGreaterThanOrEqual(avant);

    // Niveau 1 : sa propre musique, depuis le début ; le menu est en pause.
    await page.locator('[data-niveau="001"]').click();
    await attendreJeu(page);
    await expect.poll(async () => (await etat(page)).niveau).toMatchObject({ src: `${MUSIQUES.niveaux['001']}.mp3`, joue: true });
    const enJeu = await etat(page);
    expect(enJeu.niveau!.temps).toBeLessThan(3);
    expect(enJeu.menu!.joue).toBe(false);

    // Retour : Nuit Douce reprend là où elle s'était arrêtée.
    await page.locator('.barre').getByRole('button', { name: 'Retour', exact: true }).click();
    await expect.poll(async () => (await etat(page)).menu!.joue).toBe(true);
    const retour = await etat(page);
    expect(retour.menu!.temps).toBeGreaterThanOrEqual(apres.temps);
    expect(retour.niveau!.joue).toBe(false);
    expect(erreurs).toEqual([]);
  });

  test('le curseur de volume change le volume de la musique, et il est retenu', async ({ page }) => {
    await page.goto('/');
    await page.locator('.titre-jeu').click();
    await bouton(page, 'Réglages').click();
    await expect(page.locator('.reglage', { hasText: 'Signaler les mots justes' })).toHaveCount(0);
    const curseur = page.getByRole('slider', { name: 'Volume de la musique' });
    await curseur.fill('20');
    const volume = () => page.evaluate(() => document.querySelector<HTMLAudioElement>('audio[data-musique="menu"]')!.volume);
    await expect.poll(volume).toBeCloseTo(0.2);
    await bouton(page, 'Fermer').click();
    await page.reload();
    await expect.poll(volume).toBeCloseTo(0.2);
  });

  test('le réglage Musique coupe le son, et le choix est retenu', async ({ page }) => {
    await page.goto('/');
    await page.locator('.titre-jeu').click();
    await expect.poll(async () => (await etat(page)).menu!.joue).toBe(true);
    await bouton(page, 'Réglages').click();
    await page.locator('.ligne-musique .interrupteur').click();
    await expect.poll(async () => (await etat(page)).menu!.joue).toBe(false);
    await bouton(page, 'Fermer').click();
    await page.reload();
    await page.locator('.titre-jeu').click();
    await page.waitForTimeout(800);
    expect((await etat(page)).menu!.joue).toBe(false);
  });
});
