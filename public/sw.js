// Define um nome e versão para o cache
const CACHE_NAME = 'agenda-alego-cache-v1';
// Lista de URLs para fazer cache inicial
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Evento de instalação do Service Worker
self.addEventListener('install', event => {
  // Espera a instalação terminar antes de prosseguir
  event.waitUntil(
    // Abre o cache com o nome definido
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        // Adiciona todos os URLs da lista ao cache
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de ativação do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o cache não estiver na lista de permissões, delete-o
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de fetch: intercepta as requisições de rede
self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta encontrar a requisição no cache
    caches.match(event.request)
      .then(response => {
        // Se a resposta for encontrada no cache, retorna ela
        if (response) {
          return response;
        }
        // Se não, faz a requisição na rede
        return fetch(event.request);
      }
    )
  );
});
