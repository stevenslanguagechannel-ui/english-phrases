const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
document.querySelectorAll('.ex').forEach(ex => {
  const btn = ex.querySelector('button'), fb = ex.querySelector('.fb');
  if (!btn) return;
  btn.addEventListener('click', () => {
    let ok, picked = true;
    if (ex.dataset.type === 'gap') {
      const v = norm(ex.querySelector('input').value);
      picked = v.length > 0;
      ok = JSON.parse(ex.dataset.answers).some(a => norm(a) === v);
    } else {
      const c = ex.querySelector('input:checked');
      picked = !!c;
      ok = c && c.value === ex.dataset.answer;
    }
    fb.hidden = false;
    if (!picked) { fb.className = 'fb'; fb.textContent = 'Choose or type an answer first.'; return; }
    fb.className = 'fb ' + (ok ? 'ok' : 'no');
    fb.innerHTML = (ok ? 'Correct! ' : 'Not quite. ') + (ex.dataset.explain ? '<small>' + ex.dataset.explain + '</small>' : '');
  });
});
document.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));
