import { expect, test } from '@playwright/test';
import { attendreJeu, avecSauvegarde, bouton, CLE, grille, GRILLES, idMot, resoudre, surveiller, taper, victoire } from './aide';

const g1 = grille('001');
const tousLesIds = GRILLES.map((g) => g.id);

test('accueil : titre, compteurs et tous les boutons accessibles', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await expect(page.locator('.titre-jeu')).toContainText('Mots Fléchés');
  await expect(page.locator('.compteur').first()).toContainText('0/30');
  for (const nom of ['Jouer', 'Défi du jour', 'Parcours', 'Collection', 'Statistiques', 'Réglages']) {
    await bouton(page, nom).scrollIntoViewIfNeeded();
    await expect(bouton(page, nom)).toBeInViewport();
  }
  expect(erreurs).toEqual([]);
});

test('parcours : 30 niveaux, seul le premier est ouvert au départ', async ({ page }) => {
  await page.goto('/');
  await bouton(page, 'Parcours').click();
  await expect(page.locator('.pastille')).toHaveCount(30);
  await expect(page.locator('.pastille:not([disabled])')).toHaveCount(1);
  await expect(page.locator('[data-niveau="002"]')).toBeDisabled();
});

test('niveau 1 complet : sélection, erreur, vérification, indice, accents, fin, niveau suivant', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  await expect(page.locator('.barre-titre')).toContainText('Niveau 1');

  // Sélection d'une définition : le mot est mis en évidence, la définition s'affiche en grand.
  const salle = g1.mots[idMot(g1, 'SALLE')];
  await page.locator(`[data-mot="${salle.id}"]`).click();
  await expect(page.locator('.definition-active .texte')).toHaveText('De bains ou à manger');
  await expect(page.locator('.case.dans-mot')).toHaveCount(5);

  // Erreur de saisie puis vérification.
  await taper(page, 'SALLZ');
  await bouton(page, 'Vérifier').click();
  await expect(page.locator('.case.fausse')).toHaveCount(1);
  await expect(page.locator('.definition-active .texte')).toHaveText('1 lettre à corriger.');

  // Correction : la marque rouge disparaît.
  await page.locator(`[data-case="${salle.cases[4]}"]`).click();
  await taper(page, 'E');
  await expect(page.locator('.case.fausse')).toHaveCount(0);

  // Indice : une lettre révélée, il ne reste que 2 étoiles possibles.
  const but = g1.mots[idMot(g1, 'BUT')];
  await page.locator(`[data-mot="${but.id}"]`).click();
  await bouton(page, 'Indice').click();
  await expect(page.locator('.case.revelee')).toHaveText('B');
  await expect(page.locator('.barre .etoile.pleine')).toHaveCount(2);

  // Fin de grille (elle contient ÎLE et ÂNE, saisis ILE et ANE sans accent).
  await resoudre(page, g1);
  await expect(victoire(page)).toBeVisible();
  await expect(victoire(page)).toContainText('Niveau 1 terminé');
  await expect(victoire(page)).toContainText('Indices utilisés : 1');
  await expect(page.locator('.victoire .etoile.pleine')).toHaveCount(2);
  await expect(victoire(page)).toContainText('Premier pas');

  // Passage au niveau suivant, puis parcours : niveau 2 ouvert, niveau 3 fermé.
  await bouton(page, 'Grille suivante').click();
  await expect(page.locator('.barre-titre')).toContainText('Niveau 2');
  await page.locator('.barre').getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.locator('[data-niveau="002"]')).toBeEnabled();
  await expect(page.locator('[data-niveau="003"]')).toBeDisabled();
  expect(erreurs).toEqual([]);
});

test('croisement : toucher deux fois la même case change de sens', async ({ page }) => {
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  const croisement = g1.mots[idMot(g1, 'SALLE')].cases[1]; // le A commun à SALLE et NATUREL
  const definition = page.locator('.definition-active .texte');
  await page.locator(`[data-case="${croisement}"]`).click();
  const premiere = await definition.textContent();
  await page.locator(`[data-case="${croisement}"]`).click();
  await expect(definition).not.toHaveText(premiere!);
  const deux = [premiere, await definition.textContent()].sort();
  expect(deux).toEqual(['De bains ou à manger', 'Sans artifice']);
  // La lettre tapée au croisement appartient aux deux mots.
  await taper(page, 'A');
  await expect(page.locator(`[data-case="${croisement}"]`)).toHaveText('A');
});

test('effacer une lettre, effacer un mot, mot suivant', async ({ page }) => {
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  const renne = g1.mots[idMot(g1, 'RENNE')];
  await page.locator(`[data-mot="${renne.id}"]`).click();
  await taper(page, 'REN');
  await page.getByRole('button', { name: 'Effacer la lettre' }).click();
  await expect(page.locator(`[data-case="${renne.cases[2]}"]`)).toHaveText('');
  await expect(page.locator(`[data-case="${renne.cases[1]}"]`)).toHaveText('E');
  await bouton(page, 'Effacer').click();
  for (const k of renne.cases) await expect(page.locator(`[data-case="${k}"]`)).toHaveText('');
  const avant = await page.locator('.definition-active .texte').textContent();
  await page.getByRole('button', { name: 'Mot suivant' }).click();
  await expect(page.locator('.definition-active .texte')).not.toHaveText(avant!);
});

test('reprise : une partie interrompue est retrouvée après rechargement', async ({ page }) => {
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  const lier = g1.mots[idMot(g1, 'LIER')];
  await page.locator(`[data-mot="${lier.id}"]`).click();
  await taper(page, 'LIE');
  await page.reload();
  await bouton(page, 'Continuer').click();
  await attendreJeu(page);
  await expect(page.locator(`[data-case="${lier.cases[0]}"]`)).toHaveText('L');
  await expect(page.locator(`[data-case="${lier.cases[2]}"]`)).toHaveText('E');
  await expect(page.locator(`[data-case="${lier.cases[3]}"]`)).toHaveText('');
});

test('mise en page : pas de défilement de page, clavier sous la grille, touches assez grandes', async ({ page }) => {
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  await page.waitForTimeout(600); // fin de l'animation d'entrée de l'écran
  const mesures = await page.evaluate(() => {
    const boite = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    const touches = [...document.querySelectorAll('.touche')].map((t) => t.getBoundingClientRect());
    return {
      hauteurPage: document.documentElement.scrollHeight,
      largeurPage: document.documentElement.scrollWidth,
      ecran: [innerWidth, innerHeight],
      basZone: boite('.zone-grille').bottom,
      hautZone: boite('.zone-grille').top,
      hautClavier: boite('.clavier').top,
      basClavier: boite('.clavier').bottom,
      toucheMin: [Math.min(...touches.map((t) => t.width)), Math.min(...touches.map((t) => t.height))],
      caseLargeur: boite('.case.lettre').width,
      grille: { haut: boite('.grille').top, bas: boite('.grille').bottom },
      defilement: (() => {
        const z = document.querySelector('.zone-grille')!;
        return [z.scrollWidth - z.clientWidth, z.scrollHeight - z.clientHeight];
      })(),
    };
  });
  expect(mesures.hauteurPage).toBeLessThanOrEqual(mesures.ecran[1]);
  expect(mesures.largeurPage).toBeLessThanOrEqual(mesures.ecran[0]);
  expect(mesures.basZone).toBeLessThanOrEqual(mesures.hautClavier);
  expect(mesures.basClavier).toBeLessThanOrEqual(mesures.ecran[1]);
  expect(mesures.basZone - mesures.hautZone).toBeGreaterThan(150); // la grille garde une vraie place
  expect(mesures.toucheMin[0]).toBeGreaterThanOrEqual(26);
  expect(mesures.toucheMin[1]).toBeGreaterThanOrEqual(40);
  // Toute la grille est visible d'un coup : rien à faire défiler dans la zone de la grille.
  expect(mesures.grille.haut).toBeGreaterThanOrEqual(mesures.hautZone - 1);
  expect(mesures.grille.bas).toBeLessThanOrEqual(mesures.basZone + 1);
  expect(mesures.defilement).toEqual([0, 0]);
  expect(mesures.caseLargeur).toBeGreaterThanOrEqual(38);
});

test('saisie : les lettres déjà posées par un mot croisé sont sautées', async ({ page }) => {
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  const salle = g1.mots[idMot(g1, 'SALLE')];
  const naturel = g1.mots[idMot(g1, 'NATUREL')];
  await page.locator(`[data-mot="${salle.id}"]`).click();
  await taper(page, 'SALLE');
  await page.locator(`[data-mot="${naturel.id}"]`).click();
  await taper(page, 'N');
  // Le curseur est passé directement à la 3e case : le A est déjà là.
  await expect(page.locator(`[data-case="${naturel.cases[2]}"]`)).toHaveClass(/curseur/);
  await taper(page, 'TUREL');
  for (let i = 0; i < 7; i++) await expect(page.locator(`[data-case="${naturel.cases[i]}"]`)).toHaveText('NATUREL'[i]);
  for (let i = 0; i < 5; i++) await expect(page.locator(`[data-case="${salle.cases[i]}"]`)).toHaveText('SALLE'[i]);
});

test('grande grille (7 × 10) : entièrement visible sans défilement', async ({ page }) => {
  await avecSauvegarde(page, tousLesIds.slice(0, 29));
  await page.goto('/');
  await bouton(page, 'Parcours').click();
  await page.locator('[data-niveau="030"]').click();
  await attendreJeu(page);
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const z = document.querySelector('.zone-grille')!;
    const g = document.querySelector('.grille')!.getBoundingClientRect();
    const r = z.getBoundingClientRect();
    return { dedans: g.top >= r.top - 1 && g.bottom <= r.bottom + 1 && g.left >= r.left - 1 && g.right <= r.right + 1, reste: [z.scrollWidth - z.clientWidth, z.scrollHeight - z.clientHeight], bas: g.bottom, ecran: innerHeight };
  });
  expect(m.dedans).toBe(true);
  expect(m.reste).toEqual([0, 0]);
  expect(m.bas).toBeLessThan(m.ecran);
  // La dernière rangée de la grille est visible sans rien toucher.
  const g = grille('030');
  await expect(page.locator(`[data-case="${g.mots[g.mots.length - 1].cases[0]}"]`)).toBeInViewport({ ratio: 1 });
});

test('grande grille avec le réglage « Agrandir les grilles » : cases lisibles, case active toujours visible', async ({ page }) => {
  const erreurs = surveiller(page);
  await avecSauvegarde(page, tousLesIds.slice(0, 29), { agrandirGrilles: true });
  await page.goto('/');
  await bouton(page, 'Parcours').click();
  await page.locator('[data-niveau="030"]').click();
  await attendreJeu(page);
  const g = grille('030');
  expect((await page.locator('.case.lettre').first().boundingBox())!.width).toBeGreaterThanOrEqual(56);
  // On sélectionne le dernier mot (en bas de la grille) : la grille doit défiler d'elle-même.
  await page.locator(`[data-mot="${g.mots.length - 1}"]`).click();
  await expect(page.locator('.case.curseur')).toBeInViewport({ ratio: 0.99 });
  await expect
    .poll(async () => {
      const zone = (await page.locator('.zone-grille').boundingBox())!;
      const c = (await page.locator('.case.curseur').boundingBox())!;
      return c.y >= zone.y - 1 && c.y + c.height <= zone.y + zone.height + 1 && c.x >= zone.x - 1 && c.x + c.width <= zone.x + zone.width + 1;
    })
    .toBe(true);
  await resoudre(page, g);
  await expect(victoire(page)).toContainText('Niveau 30 terminé');
  await expect(bouton(page, 'Grille suivante')).toHaveCount(0); // dernier niveau
  expect(erreurs).toEqual([]);
});

test('grille intermédiaire (niveau 16) jouée jusqu’au bout', async ({ page }) => {
  await avecSauvegarde(page, tousLesIds.slice(0, 15));
  await page.goto('/');
  await bouton(page, 'Continuer').click();
  await attendreJeu(page);
  await expect(page.locator('.barre-titre')).toContainText('Niveau 16');
  await resoudre(page, grille('016'));
  await expect(victoire(page)).toContainText('Niveau 16 terminé');
  await expect(victoire(page)).toContainText('Sans aucun indice.');
  await expect(page.locator('.victoire .etoile.pleine')).toHaveCount(3);
});

test('défi du jour, puis statistiques et collection', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await bouton(page, 'Défi du jour').click();
  await attendreJeu(page);
  await expect(page.locator('.barre-titre')).toContainText('Défi du jour');
  const titre = await page.locator('.barre-titre small').textContent();
  const g = GRILLES.find((x) => x.titre === titre)!;
  expect(g).toBeTruthy();
  await resoudre(page, g);
  await expect(victoire(page)).toContainText('Défi du jour terminé');
  await expect(victoire(page)).toContainText('Défi relevé');
  await victoire(page).getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.locator('.defi')).toHaveText('✓ Défi du jour réussi');
  await expect(page.locator('.compteur').first()).toContainText('0/30'); // le défi ne modifie pas le parcours

  await bouton(page, 'Statistiques').click();
  await expect(page.locator('.tuile', { hasText: 'Défis du jour réussis' }).locator('strong')).toHaveText('1');
  await expect(page.locator('.tuile', { hasText: 'Série en cours' }).locator('strong')).toHaveText('1 jour');
  await page.getByRole('button', { name: "Retour à l'accueil" }).click();

  await bouton(page, 'Collection').click();
  await expect(page.locator('.medaille')).toHaveCount(17);
  await expect(page.locator('[data-recompense="defi"]')).toHaveClass(/obtenue/);
  await expect(page.locator('[data-recompense="trente"]')).not.toHaveClass(/obtenue/);
  expect(erreurs).toEqual([]);
});

test('réglages : le choix est conservé, et la progression s’efface après confirmation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    ([cle]) =>
      localStorage.setItem(cle, JSON.stringify({ version: 1, progression: { terminees: { '001': { etoiles: 3, indices: 0 } } }, enCours: {}, reglages: { signalerMotsJustes: true } })),
    [CLE],
  );
  await page.reload();
  await expect(page.locator('.compteur').first()).toContainText('1/30');
  await bouton(page, 'Réglages').click();
  await page.locator('.reglage', { hasText: 'Signaler les mots justes' }).locator('.interrupteur').click();
  await bouton(page, 'Effacer…').click();
  await bouton(page, 'Annuler').click();
  await bouton(page, 'Fermer').click();
  await expect(page.locator('.compteur').first()).toContainText('1/30');
  await bouton(page, 'Réglages').click();
  await bouton(page, 'Effacer…').click();
  await bouton(page, 'Oui, tout effacer').click();
  await expect(page.locator('.compteur').first()).toContainText('0/30');
  await page.reload();
  await expect(page.locator('.compteur').first()).toContainText('0/30');
  const sauvee = await page.evaluate(([cle]) => JSON.parse(localStorage.getItem(cle)!), [CLE]);
  expect(sauvee.reglages.signalerMotsJustes).toBe(false);
});

test('une sauvegarde abîmée ne bloque pas le jeu', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await page.evaluate(([cle]) => localStorage.setItem(cle, '{"version":1,"progression":"cassé","enCours":[1,2],"stats":7'), [CLE]);
  await page.reload();
  await expect(page.locator('.compteur').first()).toContainText('0/30');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  expect(erreurs).toEqual([]);
});

test('clavier physique : lettres, effacement et tabulation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'réservé à l’ordinateur');
  await page.goto('/');
  await bouton(page, 'Jouer').click();
  await attendreJeu(page);
  const naturel = g1.mots[idMot(g1, 'NATUREL')];
  await page.locator(`[data-mot="${naturel.id}"]`).click();
  await page.keyboard.type('natu');
  await expect(page.locator(`[data-case="${naturel.cases[3]}"]`)).toHaveText('U');
  await page.keyboard.press('Backspace');
  await expect(page.locator(`[data-case="${naturel.cases[3]}"]`)).toHaveText('');
  const avant = await page.locator('.definition-active .texte').textContent();
  await page.keyboard.press('Tab');
  await expect(page.locator('.definition-active .texte')).not.toHaveText(avant!);
});

test.describe('installation et hors connexion', () => {
  test.use({ serviceWorkers: 'allow' });
  test('manifeste et icônes servis, jeu disponible sans réseau après une visite', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'vérifié sur Chrome');
    const manifeste = await page.request.get('/manifest.webmanifest');
    expect(manifeste.ok()).toBe(true);
    expect((await manifeste.json()).icons.length).toBeGreaterThan(0);
    expect((await page.request.get('/icones/icone-512.png')).ok()).toBe(true);
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // deuxième visite : les fichiers passent dans le cache
    await expect(page.locator('.titre-jeu')).toBeVisible();
    await page.waitForTimeout(500);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.titre-jeu')).toContainText('Mots Fléchés');
    await bouton(page, 'Jouer').click();
    await attendreJeu(page);
  });
});
