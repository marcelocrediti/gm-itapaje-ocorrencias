// ============================================================
// Service Worker — Sistema de Ocorrências, Guarda Municipal de Itapajé
// ============================================================
const CACHE_NAME = 'gm-itapaje-app-v12';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './immutable-lock.js',
  './mobile-touch-fix.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      ASSETS_TO_CACHE.map((url) =>
        cache.add(url).catch((err) => console.warn('Não foi possível guardar para uso offline:', url, err))
      )
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

async function injectProtection(response){
  if(!response) return response;
  try{
    const contentType = response.headers.get('content-type') || '';
    if(!contentType.includes('text/html')) return response;

    let html = await response.text();
    if(!html.includes('immutable-lock.js')){
      html = html.replace('</body>', '<script src="./immutable-lock.js"></script><script src="./mobile-touch-fix.js"></script></body>');
    }else if(!html.includes('mobile-touch-fix.js')){
      html = html.replace('</body>', '<script src="./mobile-touch-fix.js"></script></body>');
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }catch(e){
    console.warn('Não foi possível aplicar os ajustes locais do aplicativo:', e);
    return response;
  }
}

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebasestorage') ||
      url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  const isAppShell = event.request.mode === 'navigate' ||
                     url.endsWith('/') || url.endsWith('/index.html');

  if (isAppShell) {
    event.respondWith((async()=>{
      try{
        const networkResponse = await fetch(event.request);
        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache)=>cache.put(event.request, cacheCopy).catch(()=>{}));
        return injectProtection(networkResponse);
      }catch(e){
        const cached = await caches.match(event.request);
        return injectProtection(cached);
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          });
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
