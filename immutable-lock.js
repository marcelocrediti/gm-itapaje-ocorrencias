// Proteção permanente dos dados fixos do plantão após o primeiro fechamento.
// Depois de everClosed=true, somente ocorrências, relatórios do dia e status podem mudar.
(function(){
  function clone(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function makeSnapshot(report){
    const snapshot = {};
    Object.keys(report || {}).forEach((key)=>{
      if(['occurrences','atividades','status','updatedAt','everClosed','immutableSnapshot'].includes(key)) return;
      snapshot[key] = clone(report[key]);
    });
    return snapshot;
  }

  function restoreImmutable(report, snapshot){
    Object.keys(snapshot || {}).forEach((key)=>{
      report[key] = clone(snapshot[key]);
    });
    report.everClosed = true;
    report.immutableSnapshot = clone(snapshot);
  }

  function installGuard(){
    if(typeof window.persistReport !== 'function'){
      setTimeout(installGuard, 50);
      return;
    }
    if(window.persistReport.__immutableGuardInstalled) return;

    const originalPersistReport = window.persistReport;

    async function guardedPersistReport(report, showStatus){
      if(!report || !report.id) return originalPersistReport(report, showStatus);

      // Se o próprio aparelho já tem a marca de fechamento e o snapshot fixo,
      // não consulta a internet a cada salvamento. Isso deixa o app muito mais rápido
      // em sinal fraco e mantém o funcionamento offline completo.
      if(report.everClosed === true && report.immutableSnapshot){
        restoreImmutable(report, report.immutableSnapshot);
        return originalPersistReport(report, showStatus);
      }

      let serverData = null;
      try{
        if(typeof db !== 'undefined' && db && !testMode && navigator.onLine){
          const doc = await db.collection('reports').doc(report.id).get();
          if(doc.exists) serverData = doc.data();
        }
      }catch(e){
        console.warn('Proteção de campos fixos: não foi possível consultar o servidor antes de salvar.', e);
      }

      const wasEverClosed = report.everClosed === true || (serverData && serverData.everClosed === true);

      if(wasEverClosed){
        let snapshot = null;
        if(serverData && serverData.immutableSnapshot){
          snapshot = clone(serverData.immutableSnapshot);
        }else if(report.immutableSnapshot){
          snapshot = clone(report.immutableSnapshot);
        }else if(serverData){
          snapshot = makeSnapshot(serverData);
        }else{
          snapshot = makeSnapshot(report);
        }
        restoreImmutable(report, snapshot);
      }

      return originalPersistReport(report, showStatus);
    }

    guardedPersistReport.__immutableGuardInstalled = true;
    window.persistReport = guardedPersistReport;
  }

  installGuard();
})();
