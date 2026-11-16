// Allège les pochettes fournies (1254 px) pour le téléphone : node outils/pochettes.cjs <dossier source>
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const noms = { 2: 'il-est-encore-temps', 3: 'pardonne-moi', 4: 'l-amour-n-a-pas-d-age', 5: 'je-t-aime', 6: 'la-lettre', 7: 'le-marionnettiste', 8: 'nostalgia', 9: 'garde-une-place-pour-moi', 10: 'l-odeur-des-orangers', 11: 'sous-les-lampadaires', 12: 'le-bal', 13: 'la-vieille-photographie', 14: 'le-village' };
const source = process.argv[2];
const cible = path.join(__dirname, '..', 'public', 'serge');
fs.mkdirSync(cible, { recursive: true });
(async () => {
  for (const [n, nom] of Object.entries(noms)) {
    const f = path.join(source, `${n}.webp`);
    await sharp(f).resize(560, 560).webp({ quality: 76 }).toFile(path.join(cible, `${nom}.webp`));
  }
  // Portrait pour l'accueil : visage recadré dans la pochette de l'EP.
  await sharp(path.join(source, '8.webp')).extract({ left: 520, top: 60, width: 640, height: 640 }).resize(320, 320).webp({ quality: 80 }).toFile(path.join(cible, 'portrait.webp'));
  console.log(fs.readdirSync(cible).map((x) => `${x} ${Math.round(fs.statSync(path.join(cible, x)).size / 1024)} Ko`).join('\n'));
})();
