// ============================================================
// Service Worker — Sistema de Ocorrências, Guarda Municipal de Itapajé
// ============================================================
const CACHE_NAME = 'gm-itapaje-app-v20';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app-icon.svg',
  './immutable-lock.js?v=20',
  './mobile-touch-fix.js?v=20',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js',
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

    // startup-fast precisa carregar ANTES do init(); para trocar a abertura por cache-first.
    if(!html.includes('startup-fast.js')){
      html = html.replace(/\ninit\(\);\s*<\/script>/, '\n<script src="./startup-fast.js"></script>\n<script>init();</script>');
    }

    if(!html.includes('immutable-lock.js')){
      html = html.replace('</body>', '<script src="./immutable-lock.js?v=20"></script><script src="./mobile-touch-fix.js?v=20"></script></body>');
    }else if(!html.includes('mobile-touch-fix.js')){
      html = html.replace('</body>', '<script src="./mobile-touch-fix.js?v=20"></script></body>');
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
      // Tenta a versão nova rapidamente. Se a internet estiver lenta, abre o cache
      // em menos de um segundo e termina a atualização em segundo plano.
      const cached = await caches.match(event.request) ||
                     await caches.match('./index.html') ||
                     await caches.match('./');
      const networkPromise = fetch(event.request, { cache:'no-store' });
      try{
        const timeout = new Promise((_, reject)=>setTimeout(()=>reject(new Error('network-timeout')), 900));
        const networkResponse = await Promise.race([networkPromise, timeout]);
        caches.open(CACHE_NAME).then((cache)=>{
          cache.put(event.request, networkResponse.clone()).catch(()=>{});
          cache.put('./index.html', networkResponse.clone()).catch(()=>{});
        });
        return injectProtection(networkResponse);
      }catch(e){
        if(cached){
          networkPromise.then((networkResponse)=>{
            caches.open(CACHE_NAME).then((cache)=>{
              cache.put(event.request, networkResponse.clone()).catch(()=>{});
              cache.put('./index.html', networkResponse.clone()).catch(()=>{});
            });
          }).catch(()=>{});
          return injectProtection(cached);
        }
        try{
          const networkResponse = await networkPromise;
          return injectProtection(networkResponse);
        }catch(_networkError){}
        return new Response('<!doctype html><html><body style="margin:0;background:#F5F7FA;font-family:sans-serif"><div style="padding:24px">Abra o sistema uma vez com internet para ativar o modo offline.</div></body></html>', {headers:{'content-type':'text/html; charset=utf-8'}});
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
