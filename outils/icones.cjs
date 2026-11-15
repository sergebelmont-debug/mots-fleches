// Fabrique les icônes de l'application (PNG) sans aucune dépendance : node outils/icones.cjs
// Motif : une petite grille de mots fléchés, case de définition bleue avec sa flèche, lettres crème, une case dorée.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloc = (type, data) => {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const somme = Buffer.alloc(4);
  somme.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, somme]);
};

function icone(taille) {
  const px = Buffer.alloc(taille * taille * 4);
  const poser = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= taille || y >= taille) return;
    const i = (y * taille + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  const rect = (x0, y0, x1, y1, coul) => {
    for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) poser(x, y, coul);
  };
  const FOND = [43, 26, 18], OR = [242, 182, 60], CREME = [255, 248, 232], BLEU = [219, 230, 243], ENCRE = [42, 28, 18], TRAIT = [185, 119, 15];
  rect(0, 0, taille, taille, FOND); // fond plein : convient aussi aux icônes « maskable »
  const marge = taille * 0.17, cote = taille - 2 * marge, c = cote / 3, jeu = taille * 0.012;
  rect(marge - jeu * 2, marge - jeu * 2, marge + cote + jeu * 2, marge + cote + jeu * 2, TRAIT);
  for (let l = 0; l < 3; l++) for (let k = 0; k < 3; k++) {
    const coul = l === 0 && k === 0 ? BLEU : l === 1 && k === 1 ? OR : CREME;
    rect(marge + k * c + jeu, marge + l * c + jeu, marge + (k + 1) * c - jeu, marge + (l + 1) * c - jeu, coul);
  }
  // Flèche vers la droite dans la case de définition.
  const cx = marge + c * 0.5, cy = marge + c * 0.5, t = c * 0.24;
  for (let y = -t; y <= t; y++) for (let x = -t; x <= t; x++) if (Math.abs(y) <= (t - x) / 2) poser(Math.round(cx + x), Math.round(cy + y), ENCRE);

  const brut = Buffer.alloc((taille * 4 + 1) * taille);
  for (let y = 0; y < taille; y++) px.copy(brut, y * (taille * 4 + 1) + 1, y * taille * 4, (y + 1) * taille * 4);
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(taille, 0);
  entete.writeUInt32BE(taille, 4);
  entete[8] = 8; entete[9] = 6; // 8 bits, RVBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', entete), bloc('IDAT', zlib.deflateSync(brut)), bloc('IEND', Buffer.alloc(0))]);
}

const dossier = path.join(__dirname, '..', 'public', 'icones');
fs.mkdirSync(dossier, { recursive: true });
for (const t of [180, 192, 512]) fs.writeFileSync(path.join(dossier, `icone-${t}.png`), icone(t));
console.log('Icônes écrites dans public/icones/');
