// ============================================================
// Service Worker — Sistema de Ocorrências, Guarda Municipal de Itapajé
// Guarda uma cópia do aplicativo (a "casca" do app: HTML, e as
// bibliotecas de Firebase, PDF etc.) no próprio celular, na primeira
// vez que abrir com internet. Depois disso, o app abre mesmo em
// local sem sinal nenhum (ex: numa serra, zona rural).
//
// IMPORTANTE: os DADOS (plantões, ocorrências) continuam sendo
// sincronizados pelo próprio Firestore, que já tem seu mecanismo
// de funcionamento offline — este arquivo só garante que o
// APLICATIVO em si (a tela) consiga abrir sem internet.
//
// Sempre que o app for atualizado (nova versão enviada ao GitHub),
// mude o número da versão abaixo (ex: 'v1' para 'v2') — isso avisa
// o celular que precisa baixar a versão nova assim que tiver internet.
// ============================================================
const CACHE_NAME = 'gm-itapaje-app-v6';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

// Guarda o app na primeira vez que abrir com internet
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            // Se um arquivo específico falhar ao guardar (ex: sem internet
            // naquele exato instante), não trava o resto — só avisa no console.
            console.warn('Não foi possível guardar para uso offline:', url, err);
          })
        )
      ))
  );
  self.skipWaiting();
});

// Limpa versões antigas guardadas, quando uma nova versão é publicada
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Ao pedir qualquer arquivo do app: se já tiver guardado, usa a cópia guardada
// na hora (funciona sem internet). Se não tiver, tenta buscar na internet e
// guarda uma cópia nova pra próxima vez.
// Exceção: chamadas ao Firestore/Storage (dados de verdade) NÃO passam por aqui —
// essas já têm o próprio mecanismo de sincronização offline do Firebase.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebasestorage') ||
      url.includes('googleapis.com/identitytoolkit')) {
    return; // deixa passar direto pro Firebase cuidar
  }

  // A PÁGINA PRINCIPAL do app (index.html) usa "internet primeiro": sempre busca a
  // versão mais nova quando online, e só usa a cópia guardada se estiver offline.
  // Isso evita ficar preso numa versão antiga depois de uma atualização — sem essa
  // regra, o app sempre mostrava a cópia velha primeiro, mesmo com internet.
  const isAppShell = event.request.mode === 'navigate' ||
                      url.endsWith('/') || url.endsWith('/index.html');
  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()).catch(()=>{}));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Os demais arquivos (bibliotecas do Firebase, PDF etc.) mudam raramente, então
  // usam "cópia guardada primeiro" — mais rápido, e atualiza por trás quando puder.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          });
          return networkResponse;
        })
        .catch(() => cachedResponse); // sem internet: usa a cópia guardada

      // Responde rápido com a cópia guardada se existir; se não, espera a internet
      return cachedResponse || networkFetch;
    })
  );
});
