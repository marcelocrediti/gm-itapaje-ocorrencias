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
    }
    body > *, #app, .wrap { max-width: 100%; }
    button, .btn, [role="button"], a { touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,.08); }
    button, .btn { min-height: 44px; }
    input, select, textarea { font-size: 16px; }
    .btn:active, button:active { transform: scale(.985); }
  `;
  document.head.appendChild(style);

  function reduceTapConfusion(){
    let startX = 0;
    let startY = 0;
    document.addEventListener('touchstart', (e)=>{
      const touch = e.touches && e.touches[0];
      if(!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    }, {passive:true});
    document.addEventListener('touchmove', (e)=>{
      const touch = e.touches && e.touches[0];
      if(!touch || e.touches.length > 1) return;
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if(dx > dy && dx > 6) e.preventDefault();
    }, {passive:false});
  }

  reduceTapConfusion();
})();
