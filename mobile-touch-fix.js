// Ajustes de resposta ao toque e navegação móvel.
(function(){
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden !important;
      overflow-x: clip !important;
      overscroll-behavior-x: none;
      overscroll-behavior-y: contain;
      touch-action: pan-y pinch-zoom;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: auto !important;
      overflow-anchor: none !important;
    }
    body > *, #app, .wrap { max-width: 100%; }
    button, .btn, [role="button"], a { touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,.08); }
    button, .btn { min-height: 40px; }
    input, select, textarea { font-size: 16px; }
    .btn:active, button:active { transform: none; }
    input:focus, select:focus, textarea:focus { scroll-margin-top: 12px; scroll-margin-bottom: 12px; }
  `;
  document.head.appendChild(style);

  // O teclado do celular pode tentar reposicionar a página a cada tecla.
  // Mantém a posição horizontal zerada e deixa o navegador cuidar apenas do
  // deslocamento vertical necessário para enxergar o campo ativo.
  window.addEventListener('scroll', () => {
    // Durante a prévia do PDF, a área interna precisa receber a pinça inteira.
    if (document.getElementById('pdfModal')?.style.display === 'flex') return;
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  }, {passive:true});

})();
