// Service worker : permet de rejouer sans connexion après une première visite.
// - Fichiers du dossier assets/ (leur nom change à chaque version) : pris dans le cache s'ils y sont.
// - Tout le reste (la page, le manifeste) : réseau d'abord, cache en secours. Une nouvelle version est donc vue tout de suite.
const CACHE = 'mots-fleches-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const nom of await caches.keys()) if (nom !== CACHE) await caches.delete(nom);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;
  // Musiques : lues par morceaux par le navigateur (requêtes partielles), trop lourdes pour le cache.
  if (/\/musique\//.test(requete.url)) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (/\/assets\//.test(requete.url)) {
        const enCache = await cache.match(requete);
        if (enCache) return enCache;
      }
      try {
        const reponse = await fetch(requete);
        if (reponse.ok) cache.put(requete, reponse.clone());
        return reponse;
      } catch (erreur) {
        const secours = (await cache.match(requete)) || (requete.mode === 'navigate' && (await cache.match('./')));
        if (secours) return secours;
        throw erreur;
      }
    })(),
  );
});
