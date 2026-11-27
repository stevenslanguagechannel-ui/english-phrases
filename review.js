(() => {
  const box = document.getElementById('rv'), by = Object.fromEntries(HWE_DATA.map(d => [d.s, d]));
  const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const queue = HWE.due().filter(s => by[s]).sort(() => Math.random() - .5).slice(0, 20);
  const total = queue.length;
  let right = 0;
  function empty() {
    box.innerHTML = HWE.size()
      ? '<div class="rv-card"><h2>Nothing to review today</h2><p>Your next check is ' + HWE.when(HWE.next()) + '. Want more? Pick a new phrase and do its tasks.</p><a class="btn" href="index.html#dictionary">Find a phrase</a></div>'
      : '<div class="rv-card"><h2>Your review is empty</h2><p>Open any phrase, do its tasks, and it joins your review. Each one comes back here a day later, then after 3 days, a week, two weeks, a month, two months. Get it wrong and it starts again.</p><a class="btn" href="index.html#dictionary">Find a phrase</a></div>';
  }
  function show() {
    if (!queue.length) {
      box.innerHTML = '<div class="rv-card"><h2>Done!</h2><p>' + right + ' of ' + total + ' right. '
        + (HWE.next() ? 'Your next check is ' + HWE.when(HWE.next()) + '.' : '') + '</p><a class="btn" href="index.html#dictionary">Learn a new phrase</a></div>';
      const t = document.getElementById('promo'); if (t) box.appendChild(t.content.cloneNode(true));
      HWE.paint(); return;
    }
    const s = queue.shift(), d = by[s], kinds = ['m', 'g', 'r'].filter(k => d[k]);
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    let q = '';
    if (k === 'm') q = '<p class="rv-q">What does <b>“' + esc(d.p) + '”</b> mean?</p>' + opts(d.m.o);
    if (k === 'r') q = '<p class="rv-q">Choose the best reply.</p><p class="rv-line"><b>' + esc(d.r.w) + ':</b> ' + esc(d.r.l) + '</p>' + opts(d.r.o);
    if (k === 'g') q = '<p class="rv-q">Fill the gap with <b>“' + esc(d.p) + '”</b> in the right form.</p><p class="rv-line">'
      + esc(d.g.t).replace('___', '<input type="text" aria-label="Missing words" autocomplete="off" spellcheck="false" autocapitalize="off">')
      + '</p><button class="btn" type="button" data-go>Check</button>';
    box.innerHTML = '<p class="rv-count">' + (total - queue.length) + ' of ' + total + '</p><div class="rv-card">' + q + '<div class="rv-fb" hidden></div></div>';
    const fb = box.querySelector('.rv-fb');
    function done(ok, extra) {
      const r = HWE.grade(s, ok); if (ok) right++; HWE.paint();
      box.querySelectorAll('button, input').forEach(x => x.disabled = true);
      fb.hidden = false; fb.className = 'rv-fb ' + (ok ? 'ok' : 'no');
      fb.innerHTML = '<b>' + (ok ? 'Correct!' : 'Not quite.') + '</b> ' + (extra || '')
        + (ok ? '' : '<p><b>' + esc(d.p) + '</b>: ' + esc(d.mean) + '</p><p class="example">' + esc(d.ex) + '</p>')
        + '<p class="rv-next">Next check ' + HWE.when(r.due) + '.'
        + (ok ? '' : ' <a href="phrase/' + s + '.html">Open the lesson</a>') + '</p>'
        + '<button class="btn" type="button" data-next>' + (queue.length ? 'Next' : 'Finish') + '</button>';
      const nb = fb.querySelector('[data-next]'); nb.disabled = false; nb.focus(); nb.onclick = show;
    }
    if (k === 'g') {
      const inp = box.querySelector('input'), go = box.querySelector('[data-go]');
      const check = () => { const v = norm(inp.value); if (v) done(d.g.a.some(a => norm(a) === v), 'Answer: <b>' + esc(d.g.a[0]) + '</b>'); };
      go.onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); }; inp.focus();
    } else {
      const t = d[k];
      box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        box.querySelectorAll('[data-i]').forEach(x => x.classList.toggle('right', +x.dataset.i === t.a));
        if (i !== t.a) b.classList.add('wrong');
        done(i === t.a, k === 'r' && t.x ? '<small>' + esc(t.x) + '</small>' : '');
      });
    }
  }
  function opts(o) { return '<div class="rv-opts">' + o.map((x, i) => '<button type="button" data-i="' + i + '">' + esc(x) + '</button>').join('') + '</div>'; }
  total ? show() : empty();
})();
