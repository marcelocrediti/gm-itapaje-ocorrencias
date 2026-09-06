// Ajustes de resposta ao toque e navegação móvel.
(function(){
  const style = document.createElement('style');
  style.textContent = `
    html, body { -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
    button, .btn, [role="button"], a { touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,.08); }
    button, .btn { min-height: 44px; }
    input, select, textarea { font-size: 16px; }
    .btn:active, button:active { transform: scale(.985); }
  `;
  document.head.appendChild(style);

  function installFastSave(){
    if(typeof window.scheduleSave === 'function' && !window.scheduleSave.__touchOptimized){
      const originalPersist = window.persistReport;
      window.scheduleSave = function(){
        clearTimeout(window.saveTimer);
        if(typeof window.setStatus === 'function') window.setStatus('Salvando…', true);
        window.saveTimer = setTimeout(()=>{
          if(typeof window.persistReport === 'function' && window.currentReport){
            window.persistReport(window.currentReport, true);
          }
        }, 220);
      };
      window.scheduleSave.__touchOptimized = true;
    }
  }

  function patchActionButtons(){
    const saveBtn = document.getElementById('btnSave');
    if(saveBtn && !saveBtn.dataset.touchPatched){
      saveBtn.dataset.touchPatched = '1';
      saveBtn.addEventListener('pointerdown', ()=> saveBtn.classList.add('touch-active'), {passive:true});
      ['pointerup','pointercancel','pointerleave'].forEach(ev=>saveBtn.addEventListener(ev, ()=>saveBtn.classList.remove('touch-active'), {passive:true}));
    }

    const backBtn = document.getElementById('btnBack');
    if(backBtn && !backBtn.dataset.touchPatched){
      backBtn.dataset.touchPatched = '1';
      backBtn.addEventListener('click', ()=>{
        try{
          if(typeof window.flushPendingSave === 'function') window.flushPendingSave();
        }catch(e){ console.warn('Não foi possível forçar salvamento antes de voltar:', e); }
      }, true);
    }
  }

  function reduceTapConfusion(){
    document.addEventListener('touchstart', (e)=>{}, {passive:true});
  }

  installFastSave();
  patchActionButtons();
  reduceTapConfusion();

  const observer = new MutationObserver(()=>{
    installFastSave();
    patchActionButtons();
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();
