// ══ GLOBAL LOADER HELPERS ══
function showLoader(label){
  const el = $('global-loader');
  $('global-loader-label').textContent = label || '';
  el.style.display = 'flex';
  requestAnimationFrame(()=> el.classList.add('show'));
}

function hideLoader(){
  const el = $('global-loader');
  el.classList.remove('show');
  setTimeout(()=>{ el.style.display = 'none'; }, 380);
}
