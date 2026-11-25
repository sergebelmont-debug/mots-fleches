// Chiffre les musiques pour le jeu : node outils/chiffrer-musiques.cjs
// Lit musique-source/*.mp3 (sur ton ordinateur, jamais dans le dépôt) et la clé VITE_MUSIQUE_CLE
// (fichier .env.local, ou variable d'environnement), et écrit public/musique/<nom>.bin.
// Format d'un .bin : 12 octets de vecteur d'initialisation, puis le MP3 chiffré en AES-256-GCM
// (avec son étiquette d'authentification de 16 octets à la fin), lisible par WebCrypto dans le navigateur.
// Le vecteur est tiré du nom du morceau et de la clé : rechiffrer donne exactement le même fichier.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const racine = path.join(__dirname, '..');
function lireCle() {
  if (process.env.VITE_MUSIQUE_CLE) return process.env.VITE_MUSIQUE_CLE;
  const f = path.join(racine, '.env.local');
  const m = fs.existsSync(f) && fs.readFileSync(f, 'utf8').match(/^VITE_MUSIQUE_CLE=(.+)$/m);
  if (!m) throw new Error('Clé introuvable : VITE_MUSIQUE_CLE (fichier .env.local)');
  return m[1].trim();
}
const cle = Buffer.from(lireCle(), 'base64');
if (cle.length !== 32) throw new Error('La clé doit faire 32 octets (encodée en base64)');

const source = path.join(racine, 'musique-source');
const cible = path.join(racine, 'public', 'musique');
fs.mkdirSync(cible, { recursive: true });
for (const f of fs.readdirSync(cible)) if (f.endsWith('.mp3')) fs.unlinkSync(path.join(cible, f)); // jamais de MP3 en clair à publier

for (const f of fs.readdirSync(source).filter((x) => x.endsWith('.mp3')).sort()) {
  const nom = f.replace(/\.mp3$/, '');
  const iv = crypto.createHmac('sha256', cle).update(nom).digest().subarray(0, 12);
  const chiffreur = crypto.createCipheriv('aes-256-gcm', cle, iv);
  const donnees = Buffer.concat([chiffreur.update(fs.readFileSync(path.join(source, f))), chiffreur.final(), chiffreur.getAuthTag()]);
  fs.writeFileSync(path.join(cible, `${nom}.bin`), Buffer.concat([iv, donnees]));
}
console.log(`${fs.readdirSync(cible).filter((x) => x.endsWith('.bin')).length} musiques chiffrées dans public/musique/`);
