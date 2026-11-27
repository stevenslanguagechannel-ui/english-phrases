const HWE = (() => {
  const KEY = 'hwe-progress', META = 'hwe-meta', GAPS = [1, 3, 7, 14, 30, 60];
  const day = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
  const mem = {};
  function read(k) { try { return JSON.parse(localStorage.getItem(k)) || mem[k] || {}; } catch (e) { return mem[k] || {}; } }
  function write(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  const load = () => read(KEY), save = p => write(KEY, p);
  function get(s) { return load()[s]; }
  function all() { return load(); }
  function due() { const p = load(), t = day(); return Object.keys(p).filter(s => p[s].due <= t); }
  function practised(s) { const p = load(); if (!p[s]) { p[s] = { box: 0, due: day(1), last: day() }; save(p); } return p[s]; }
  function grade(s, ok) {
    const p = load(), r = p[s] || { box: 0 };
    r.box = ok ? Math.min(r.box + 1, GAPS.length - 1) : 0;
    r.due = day(GAPS[r.box]); r.last = day(); p[s] = r; save(p); return r;
  }
  function level(r) {
    if (!r || !r.m || !r.m.length) return 0;
    return Math.min(3, new Set(r.m.map(x => x[1])).size, new Set(r.m.map(x => x[0])).size);
  }
  function master(s, type) {
    const p = load(), r = p[s] || (p[s] = { box: 0, due: day(1), last: day() }), t = day();
    r.m = r.m || [];
    if (!r.m.some(x => x[0] === type && x[1] === t)) r.m.push([type, t]);
    save(p); return level(r);
  }
  function meta() { return read(META); }
  function finished(score) {
    const m = meta(), t = day();
    if (m.last !== t) { m.streak = m.last === day(-1) ? (m.streak || 0) + 1 : 1; m.last = t; }
    m.best = Math.max(m.best || 0, score); write(META, m); return m;
  }
  function streak() { const m = meta(); return m.last === day() || m.last === day(-1) ? m.streak || 0 : 0; }
  function when(d) {
    const n = Math.round((new Date(d + 'T12:00') - new Date(day() + 'T12:00')) / 864e5);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
  }
  const dots = n => '●'.repeat(n) + '○'.repeat(3 - n);
  function paint() {
    const p = load(), keys = Object.keys(p), d = due().length, done = keys.filter(s => level(p[s]) === 3).length;
    document.querySelectorAll('[data-due]').forEach(b => { b.hidden = !d; b.textContent = d; });
    const mine = document.getElementById('mine');
    if (mine && p[mine.dataset.slug]) {
      const r = p[mine.dataset.slug], l = level(r);
      mine.hidden = false;
      mine.innerHTML = 'Mastery <span class="dots">' + dots(l) + '</span> · ' + (l === 3 ? 'mastered!' : 'next drill ' + when(r.due))
        + ' · <a href="../drill.html">Go to drills</a>';
    }
    const box = document.getElementById('mine-box');
    if (box) {
      box.hidden = false;
      const s = streak();
      box.innerHTML = keys.length
        ? '<b>Your drills</b><span>' + keys.length + ' phrase' + (keys.length > 1 ? 's' : '') + ' in practice · ' + done + ' mastered'
          + (s ? ' · ' + s + '-day streak' : '') + (d ? ' · <strong>' + d + ' due today</strong>' : '') + '</span><a class="btn" href="drill.html">' + (d ? "Start today's drill" : 'Drill now') + '</a>'
        : '<b>Daily drills</b><span>Ten quick drills: say it, fix it and change it from memory. About five minutes a day.</span><a class="btn" href="drill.html">Try a drill</a>';
    }
    document.querySelectorAll('a.card').forEach(c => {
      const m = c.getAttribute('href').match(/([^/]+)\.html$/), r = m && p[m[1]];
      c.classList.toggle('done', !!r && level(r) < 3);
      c.classList.toggle('mastered', !!r && level(r) === 3);
    });
  }
  document.addEventListener('DOMContentLoaded', paint);
  return { get, all, due, practised, grade, level, master, finished, streak, meta, when, dots, paint, day };
})();
