// Abertura rápida: mostra dados locais imediatamente e sincroniza a nuvem em segundo plano.
(function(){
  const LS_INDEX = 'gmItapaje_fastIndex_v1';
  const originalLoadIndex = window.loadIndex;
  const originalLoadTrash = window.loadTrash;
  const originalLoadLegalKB = window.loadLegalKB;

  function safeParse(value, fallback){
    try { return JSON.parse(value); } catch(e) { return fallback; }
  }

  function saveIndexSnapshot(){
    try { localStorage.setItem(LS_INDEX, JSON.stringify(Array.isArray(window.reportsIndex) ? window.reportsIndex : reportsIndex)); } catch(e) {}
  }

  function applySnap(snap){
    const target = snap.docs.filter(d=>!d.data().deleted).map(d=>{
      const data = d.data();
      return {
        id: d.id,
        date: data.date,
        turno: data.turno,
        comandante: (data.officers && data.officers.comandante) || '',
        viaturas: [...new Set((data.vtrLog||[]).map(v=>v.viatura).filter(Boolean))].join(', '),
        status: data.status,
        occCount: (data.occurrences||[]).length
      };
    });
    reportsIndex = target;
    saveIndexSnapshot();
  }

  async function cacheFirstIndex(){
    if(typeof ensureFirebase === 'function' && !ensureFirebase()){
      reportsIndex = [];
      return;
    }

    // Primeiro mostra o último índice conhecido, sem qualquer espera de rede.
    const local = safeParse(localStorage.getItem(LS_INDEX), null);
    if(Array.isArray(local) && local.length) reportsIndex = local;

    // Tenta o cache persistente do Firestore, mas nunca segura a abertura por muito tempo.
    if(typeof db !== 'undefined' && db && !testMode){
      try{
        const cachePromise = db.collection('reports').get({source:'cache'});
        const timeout = new Promise((_, reject)=>setTimeout(()=>reject(new Error('cache-timeout')), 120));
        const snap = await Promise.race([cachePromise, timeout]);
        if(snap) applySnap(snap);
      }catch(e){
        // Sem cache local disponível: segue com o último índice salvo e abre a tela mesmo assim.
      }
    }else if(typeof originalLoadIndex === 'function'){
      await originalLoadIndex();
      saveIndexSnapshot();
      return;
    }

    // Atualização completa roda depois da primeira tela já estar visível.
    if(typeof originalLoadIndex === 'function' && navigator.onLine){
      setTimeout(()=>{
        originalLoadIndex().then(()=>{
          saveIndexSnapshot();
          if(typeof view !== 'undefined' && view === 'dashboard' && typeof render === 'function') render();
        }).catch(()=>{});
      }, 0);
    }
  }

  // Lixeira e base legal não devem bloquear a tela inicial.
  async function backgroundTrash(){
    if(typeof originalLoadTrash === 'function') setTimeout(()=>originalLoadTrash().catch(()=>{}), 0);
  }
  async function backgroundLegal(){
    if(typeof originalLoadLegalKB === 'function') setTimeout(()=>originalLoadLegalKB().then(()=>{
      if(typeof view !== 'undefined' && view === 'dashboard' && typeof render === 'function') render();
    }).catch(()=>{}), 0);
  }

  if(typeof originalLoadIndex === 'function') window.loadIndex = cacheFirstIndex;
  if(typeof originalLoadTrash === 'function') window.loadTrash = backgroundTrash;
  if(typeof originalLoadLegalKB === 'function') window.loadLegalKB = backgroundLegal;

  // Evita o flash preto entre a abertura do Web App e a primeira renderização.
  try{
    document.documentElement.style.background = '#F5F7FA';
    if(document.body) document.body.style.background = '#F5F7FA';
  }catch(e){}
})();
