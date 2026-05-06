// Service Worker FidelioPro — permet à la carte client de fonctionner hors-ligne
// Stratégie : cache de l'app shell + libs CDN. Les appels Supabase passent par le réseau (échouent gracieusement hors-ligne, on affiche les données en cache via localStorage côté JS).

const CACHE_VERSION = 'fideliopro-v2';
const APP_SHELL = [
  '/client.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
  '/images/logo-horizontal.png',
  // Libs CDN — mises en cache à la première visite, ne changent quasi jamais
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

// Installation : pré-cache l'app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Cache "best effort" — on ne fail pas l'install si une ressource n'est pas disponible
      return Promise.all(
        APP_SHELL.map(url =>
          cache.add(new Request(url, {mode: 'no-cors'})).catch(err => {
            console.warn('SW: skip cache for', url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches (version précédente)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch : strategy = network-first pour le HTML, cache-first pour les assets, network-only pour Supabase
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne traiter que les requêtes GET
  if (req.method !== 'GET') return;

  // Supabase API : network only (jamais en cache, on veut les données fraîches)
  if (url.host.includes('supabase.co')) {
    return; // browser default
  }

  // Stratégie : essayer le réseau, fallback cache si échec
  event.respondWith(
    fetch(req)
      .then(response => {
        // Mettre en cache la réponse pour usage offline futur
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // Réseau KO, on regarde dans le cache
        return caches.match(req).then(cached => {
          if (cached) return cached;
          // Pour les requêtes HTML, fallback sur client.html en cache
          if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
            return caches.match('/client.html');
          }
          // Sinon, vraie erreur
          return new Response('Offline', {status: 503, statusText: 'Service Unavailable'});
        });
      })
  );
});
