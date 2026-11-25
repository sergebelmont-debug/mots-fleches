// Convertit les musiques fournies (WAV) en MP3 légers, au volume égalisé :
//   node outils/musiques.cjs <dossier des WAV> <chemin de ffmpeg>
// Résultat : public/musique/<nom>.mp3 (96 kb/s, stéréo, 44,1 kHz, volume ramené à -18 LUFS).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [source, ffmpeg] = process.argv.slice(2);
if (!source || !ffmpeg) {
  console.log('Usage : node outils/musiques.cjs <dossier des WAV> <chemin de ffmpeg>');
  process.exit(1);
}
const cible = path.join(__dirname, '..', 'public', 'musique');
fs.mkdirSync(cible, { recursive: true });

/** « Nostalgie d'antan (3).wav » → « nostalgie-d-antan-3 » */
const nom = (f) =>
  f
    .replace(/\.wav$/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

for (const f of fs.readdirSync(source).filter((x) => /\.wav$/i.test(x)).sort()) {
  const sortie = path.join(cible, `${nom(f)}.mp3`);
  const r = spawnSync(
    ffmpeg,
    ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(source, f), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '96k', sortie],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) {
    console.log(`ÉCHEC ${f} : ${r.stderr}`);
    process.exit(1);
  }
  console.log(`${f.padEnd(30)} → musique/${path.basename(sortie)} (${(fs.statSync(sortie).size / 1048576).toFixed(1)} Mo)`);
}
