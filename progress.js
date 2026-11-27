const HWE = (() => {
  const KEY = 'hwe-progress', GAPS = [1, 3, 7, 14, 30, 60];
  const day = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
  let mem = {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || mem; } catch (e) { return mem; } }
  function save(p) { mem = p; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
  function get(s) { return load()[s]; }
  function due() { const p = load(), t = day(); return Object.keys(p).filter(s => p[s].due <= t); }
  function practised(s) { const p = load(); if (!p[s]) { p[s] = { box: 0, due: day(1), last: day() }; save(p); } return p[s]; }
  function grade(s, ok) {
    const p = load(), r = p[s] || { box: 0 };
    r.box = ok ? Math.min(r.box + 1, GAPS.length - 1) : 0;
    r.due = day(GAPS[r.box]); r.last = day(); p[s] = r; save(p); return r;
  }
  function when(d) {
    const n = Math.round((new Date(d + 'T12:00') - new Date(day() + 'T12:00')) / 864e5);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
  }
  function next() { const ds = Object.values(load()).map(r => r.due).sort(); return ds[0]; }
  function paint() {
    const p = load(), n = Object.keys(p).length, d = due().length;
    document.querySelectorAll('[data-due]').forEach(b => { b.hidden = !d; b.textContent = d; });
    const mine = document.getElementById('mine');
    if (mine && p[mine.dataset.slug]) { mine.hidden = false; mine.textContent = '✓ In your review · next check ' + when(p[mine.dataset.slug].due); }
    const box = document.getElementById('mine-box');
    if (box && n) {
      box.hidden = false;
      box.innerHTML = '<b>Your review</b><span>You are practising ' + n + ' phrase' + (n > 1 ? 's' : '') + '. '
        + (d ? d + ' due today.' : 'Nothing due today. Next check ' + when(next()) + '.') + '</span>'
        + (d ? '<a class="btn" href="review.html">Start review</a>' : '');
    }
    document.querySelectorAll('a.card').forEach(c => {
      const m = c.getAttribute('href').match(/([^/]+)\.html$/);
      c.classList.toggle('done', !!(m && p[m[1]]));
    });
  }
  document.addEventListener('DOMContentLoaded', paint);
  return { get, due, practised, grade, when, next, paint, size: () => Object.keys(load()).length };
})();
