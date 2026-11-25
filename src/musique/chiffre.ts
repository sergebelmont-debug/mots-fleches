// Déchiffrement des musiques dans le navigateur (format produit par outils/chiffrer-musiques.cjs) :
// 12 octets de vecteur d'initialisation, puis le MP3 chiffré en AES-256-GCM.

const enOctets = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

export async function dechiffrer(donnees: ArrayBuffer, cleBase64: string): Promise<ArrayBuffer> {
  const cle = await crypto.subtle.importKey('raw', enOctets(cleBase64), 'AES-GCM', false, ['decrypt']);
  const octets = new Uint8Array(donnees);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: octets.subarray(0, 12) }, cle, octets.subarray(12));
}
