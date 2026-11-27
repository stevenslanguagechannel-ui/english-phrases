(() => {
  const app = document.getElementById('dr'), by = Object.fromEntries(HWE_DATA.map(d => [d.s, d]));
  const TOPICS = [...new Set(HWE_DATA.map(d => d.t))];
  const NAMES = { say: 'Say it', form: 'Change the form', fix: 'Fix the mistake', order: 'Build the sentence', speak: 'Speak it' };
  const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const canSpeak = 'speechSynthesis' in window;
  const canRecord = !!(navigator.mediaDevices && window.MediaRecorder);
  let speakOn = true; try { speakOn = localStorage.getItem('hwe-speak') !== 'off'; } catch (e) {}

  function lev(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return d[b.length];
  }
  // irregular past forms, so "held him back" matches "hold (someone) back"
  const IRR = { hold: 'held', take: 'took taken', get: 'got gotten', give: 'gave given', make: 'made', go: 'went gone', come: 'came',
    keep: 'kept', bring: 'brought', catch: 'caught', run: 'ran', break: 'broke broken', fall: 'fell fallen', throw: 'threw thrown',
    sleep: 'slept', pay: 'paid', say: 'said', tell: 'told', find: 'found', see: 'saw seen', stand: 'stood', draw: 'drew drawn',
    drive: 'drove driven', sell: 'sold', think: 'thought', buy: 'bought', feel: 'felt', leave: 'left', lose: 'lost', meet: 'met',
    speak: 'spoke spoken', wear: 'wore worn', win: 'won', bite: 'bit bitten', blow: 'blew blown', fly: 'flew flown', hang: 'hung',
    hide: 'hid hidden', ride: 'rode ridden', shake: 'shook shaken', steal: 'stole stolen', swim: 'swam swum', tear: 'tore torn',
    sink: 'sank sunk', light: 'lit', lead: 'led', spend: 'spent', send: 'sent', build: 'built', teach: 'taught', fight: 'fought',
    do: 'did done does', be: 'is are was were been', have: 'has had', know: 'knew known', grow: 'grew grown', begin: 'began begun' };
  const FILL = "(?: [a-z']+){0,3}";
  function pattern(phrase) {
    const words = norm(phrase.replace(/\((someone|somebody|something|sb|sth)\)/gi, ' qslotq ').replace(/\(([^)]*)\)/g, '$1')).split(' ');
    const parts = words.map(w => {
      if (w === 'qslotq') return FILL;
      if (w === "one's" || w === 'your') return " (?:my|your|his|her|our|their|one's|its)";
      const forms = [w].concat((IRR[w] || '').split(' ').filter(Boolean));
      const stem = w.length > 3 ? w.replace(/e$/, '') : w;
      return ' (?:' + forms.concat([stem + "[a-z']*"]).join('|') + ')';
    });
    return new RegExp('(?:^| )' + parts.join('').replace(/^ /, '') + '(?: |$)');
  }
  const near = (v, a, tol) => lev(norm(v), norm(a)) <= tol;
  function judge(it, v) {
    const d = it.d, x = norm(v);
    if (!x) return null;
    if (it.type === 'say') return pattern(d.p).test(x) || d.sit.a.some(a => near(v, a, 1)) ? 'ok' : 'no';
    if (it.type === 'form') {
      const f = d.fo[it.i];
      if (f.a.some(a => norm(a) === x)) return 'ok';
      return f.a.some(a => near(v, a, Math.max(1, Math.floor(a.length / 12)))) ? 'typo' : 'no';
    }
    if (it.type === 'fix') {
      if (x === norm(d.fx.w)) return 'same';
      if (d.fx.r.some(a => norm(a) === x)) return 'ok';
      return d.fx.r.some(a => near(v, a, 1) && lev(x, norm(a)) < lev(x, norm(d.fx.w))) ? 'typo' : 'no';
    }
  }

  // ---------- rounds ----------
  function types(d) {
    const t = ['say'];
    if (d.fo && d.fo.length) t.push('form');
    if (d.fx) t.push('fix');
    if (d.ex.split(' ').length <= 14) t.push('order');
    if (speakOn && canSpeak && d.q) t.push('speak');
    return t.filter(x => x !== 'say' || d.sit);
  }
  function build(topic) {
    const p = HWE.all(), inTopic = d => !topic || d.t === topic;
    const known = Object.keys(p).filter(s => by[s] && inTopic(by[s]) && HWE.level(p[s]) < 3);
    const dueNow = new Set(HWE.due());
    known.sort((a, b) => (dueNow.has(b) - dueNow.has(a)) || HWE.level(p[a]) - HWE.level(p[b]));
    let fresh = shuffle(HWE_DATA.filter(d => !p[d.s] && inTopic(d)).map(d => d.s));
    if (!topic && known.length) {   // new phrases come from the topic you've practised most
      const count = {}; Object.keys(p).forEach(s => by[s] && (count[by[s].t] = (count[by[s].t] || 0) + 1));
      const fav = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      fresh.sort((a, b) => (by[b].t === fav) - (by[a].t === fav));
    }
    const nNew = known.length >= 8 ? 1 : known.length >= 4 ? 2 : 3;
    const picks = known.slice(0, 7).concat(fresh.slice(0, nNew));
    const items = [], perPhrase = Math.max(1, Math.ceil(10 / picks.length));
    picks.forEach(s => {
      const d = by[s], done = new Set(((p[s] || {}).m || []).map(x => x[0]));
      const ts = shuffle(types(d)).sort((a, b) => done.has(a) - done.has(b)).slice(0, Math.min(perPhrase, 3));
      ts.forEach(type => items.push({ s, d, type, i: type === 'form' ? Math.floor(Math.random() * d.fo.length) : 0 }));
    });
    let round = shuffle(items).slice(0, 10);
    for (let k = 1; k < round.length; k++)   // the same phrase twice in a row gives the answer away
      if (round[k].s === round[k - 1].s) { const j = round.findIndex((x, n) => n > k && x.s !== round[k].s); if (j > 0) [round[k], round[j]] = [round[j], round[k]]; }
    const learn = fresh.slice(0, nNew).filter(s => round.some(x => x.s === s)).map(s => ({ s, d: by[s], type: 'learn' }));
    return learn.concat(round);
  }

  // ---------- screens ----------
  function home() {
    const p = HWE.all(), keys = Object.keys(p), d = HWE.due().length, s = HWE.streak(), m = HWE.meta();
    const mastered = keys.filter(k => HWE.level(p[k]) === 3).length;
    app.innerHTML = '<div class="dr-card dr-home"><h2>' + (keys.length ? "Today's drill" : 'Your first drill') + '</h2>'
      + '<p>Ten quick drills. Say it, fix it and change it from memory, with nothing to copy from. A phrase is <b>mastered</b> when you get it right in 3 different drills on 3 different days.</p>'
      + '<div class="dr-stats"><span><b>' + keys.length + '</b>in practice</span><span><b>' + mastered + '</b>mastered</span><span><b>' + d + '</b>due today</span><span><b>' + s + '</b>day streak</span>'
      + (m.best ? '<span><b>' + m.best + '</b>best score</span>' : '') + '</div>'
      + '<button class="btn big" type="button" data-start>Start</button></div>'
      + '<h2 class="sec">Or drill a topic</h2><div class="chips dr-topics">' + TOPICS.map(t => '<button type="button" data-topic="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>'
      + (canSpeak ? '<label class="dr-opt"><input type="checkbox" data-speakopt' + (speakOn ? ' checked' : '') + '> Speaking drills (uses your microphone, nothing is uploaded)</label>' : '');
    app.querySelector('[data-start]').onclick = () => play(null);
    app.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => play(b.dataset.topic));
    const so = app.querySelector('[data-speakopt]');
    if (so) so.onchange = () => { speakOn = so.checked; try { localStorage.setItem('hwe-speak', speakOn ? 'on' : 'off'); } catch (e) {} };
  }

  let R;   // the round in progress
  function play(topic) {
    R = { q: build(topic), n: 0, score: 0, right: 0, asked: 0, combo: 0, graded: new Set(), retried: new Set(), up: {}, t0: Date.now(), topic };
    if (!R.q.length) { app.innerHTML = '<div class="dr-card"><h2>All mastered!</h2><p>Every phrase here is mastered. Pick another topic.</p><button class="btn" type="button" data-home>Back</button></div>'; app.querySelector('[data-home]').onclick = home; return; }
    clearInterval(R.tick); R.tick = setInterval(() => { const c = app.querySelector('.dr-time'); if (c) c.textContent = clock(); }, 1000);
    next();
  }
  const clock = () => { const s = Math.floor((Date.now() - R.t0) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function bar() {
    const drills = R.q.filter(x => x.type !== 'learn').length, at = R.q.slice(0, R.n + 1).filter(x => x.type !== 'learn').length;
    return '<div class="dr-bar"><span>' + (R.q[R.n].type === 'learn' ? 'New phrase' : 'Drill ' + at + ' of ' + drills) + '</span><span>' + R.score + ' pts' + (R.combo >= 3 ? ' · 🔥 ' + R.combo + ' in a row' : '') + '</span><span class="dr-time">' + clock() + '</span></div>'
      + '<div class="dr-progress"><i style="width:' + Math.round(100 * R.n / R.q.length) + '%"></i></div>';
  }
  function next() {
    if (R.n >= R.q.length) return end();
    const it = R.q[R.n]; it.t0 = Date.now(); it.hint = 0;
    if (it.type === 'learn') return learn(it);
    let body = '';
    const d = it.d;
    if (it.type === 'say') body = '<p class="dr-q">' + esc(d.sit.t) + '</p><p class="dr-help">Type what you would say. Use the idiom.</p>'
      + '<input class="dr-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer"><p class="dr-hint" hidden></p>';
    if (it.type === 'form') { const f = d.fo[it.i]; body = '<p class="dr-help">Use <b>' + esc(d.p) + '</b> in this form: <span class="tag">' + esc(f.c) + '</span></p>'
      + '<p class="dr-q">' + esc(f.t).replace('___', '<input class="dr-in inline" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Missing words">') + '</p>'; }
    if (it.type === 'fix') body = '<p class="dr-help">This sentence has one mistake. Edit it so it is correct.</p>'
      + '<textarea class="dr-in" rows="3" autocapitalize="off" spellcheck="false" aria-label="Corrected sentence">' + esc(d.fx.w) + '</textarea>';
    if (it.type === 'order') {
      it.words = d.ex.split(' '); let mix; do mix = shuffle(it.words.map((w, i) => i)); while (mix.length > 2 && mix.every((v, i) => v === i));
      body = '<p class="dr-help">Tap the words in the right order.</p><p class="dr-mean">' + esc(d.mean) + '</p><div class="dr-built" aria-live="polite"></div><div class="dr-words">'
        + mix.map(i => '<button type="button" data-w="' + i + '">' + esc(it.words[i]) + '</button>').join('') + '</div>';
    }
    if (it.type === 'speak') body = '<p class="dr-help">Listen, then answer out loud in 2–3 sentences. Use <b>' + esc(d.p) + '</b>.</p>'
      + '<p class="dr-q">' + esc(d.q) + ' <button class="icon" type="button" data-say aria-label="Hear the question">🔊</button></p>'
      + '<div class="dr-rec">' + (canRecord ? '<button class="btn" type="button" data-rec>● Record</button><audio controls hidden></audio>' : '<p class="dr-help">Say your answer out loud now.</p>') + '</div>';
    const typed = it.type === 'say' || it.type === 'form' || it.type === 'fix';
    app.innerHTML = bar() + '<div class="dr-card"><p class="dr-type">' + NAMES[it.type] + '</p>' + body
      + '<div class="dr-actions">' + (it.type === 'say' ? '<button class="btn ghost" type="button" data-hint>Hint</button>' : '')
      + (typed || it.type === 'order' ? '<button class="btn" type="button" data-check>Check</button>' : '<button class="btn" type="button" data-reveal>Show an example answer</button>')
      + '</div><div class="dr-fb" hidden></div></div>';
    const inp = app.querySelector('.dr-in');
    if (inp) { inp.focus(); if (it.type === 'fix') inp.setSelectionRange(0, 0); inp.onkeydown = e => { if (e.key === 'Enter' && it.type !== 'fix') { e.preventDefault(); check(it); } }; }
    const c = app.querySelector('[data-check]'); if (c) c.onclick = () => check(it);
    const h = app.querySelector('[data-hint]'); if (h) h.onclick = () => hint(it);
    if (it.type === 'order') order(it);
    if (it.type === 'speak') speak(it);
  }
  function learn(it) {
    const d = it.d;
    app.innerHTML = bar() + '<div class="dr-card dr-learn"><p class="dr-type">New phrase</p><h2>' + esc(d.p) + '</h2><p class="meaning">' + esc(d.mean) + '</p>'
      + '<p class="example">' + esc(d.ex) + '</p>' + (d.img ? '<img src="img/' + esc(d.img) + '" alt="Comic strip for ' + esc(d.p) + '" loading="lazy">' : '')
      + '<p class="dr-help">Remember it: you will use it later in this round.</p><div class="dr-actions"><button class="btn" type="button" data-go>Got it</button></div></div>';
    const b = app.querySelector('[data-go]'); b.focus(); b.onclick = () => { HWE.practised(it.s); R.n++; next(); };
  }
  function hint(it) {
    it.hint++;
    const h = app.querySelector('.dr-hint'), words = it.d.p.replace(/\([^)]*\)/g, '…').split(/\s+/);
    h.hidden = false;
    h.textContent = 'Hint: ' + words.map(w => w === '…' ? '…' : it.hint > 1 ? w : w[0] + '_'.repeat(Math.max(0, w.length - 1))).join(' ');
    if (it.hint > 1) app.querySelector('[data-hint]').disabled = true;
  }
  function order(it) {
    const built = app.querySelector('.dr-built'), pool = app.querySelector('.dr-words');
    pool.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; built.appendChild(b); };
    built.onclick = e => { const b = e.target.closest('button'); if (!b || b.disabled) return; pool.appendChild(b); };
  }
  function say(text) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), v = speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
    u.voice = v.find(v => /en.(GB|US)/i.test(v.lang) && /natural|google|samantha|daniel|serena/i.test(v.name)) || v[0] || null;
    u.lang = (u.voice && u.voice.lang) || 'en-GB'; u.rate = .95; speechSynthesis.speak(u);
  }
  function speak(it) {
    const d = it.d;
    app.querySelector('[data-say]').onclick = () => say(d.q);
    setTimeout(() => say(d.q), 300);
    const rec = app.querySelector('[data-rec]');
    if (rec) {
      let mr, chunks = [];
      rec.onclick = async () => {
        if (mr && mr.state === 'recording') { mr.stop(); return; }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mr = new MediaRecorder(stream); chunks = [];
          mr.ondataavailable = e => chunks.push(e.data);
          mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const a = app.querySelector('audio'); a.src = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })); a.hidden = false; rec.textContent = '● Record again'; rec.classList.remove('on'); };
          mr.start(); rec.textContent = '■ Stop'; rec.classList.add('on');
        } catch (e) { rec.outerHTML = '<p class="dr-help">No microphone, so say your answer out loud.</p>'; }
      };
    }
    app.querySelector('[data-reveal]').onclick = () => {
      const fb = app.querySelector('.dr-fb'); fb.hidden = false; fb.className = 'dr-fb';
      fb.innerHTML = '<p><b>Example answer</b> <button class="icon" type="button" data-say2 aria-label="Hear the example">🔊</button></p><p class="example">' + esc(d.mo) + '</p>'
        + '<p class="dr-help">Did you use <b>' + esc(d.p) + '</b> correctly and naturally?</p><div class="dr-actions"><button class="btn" type="button" data-yes>Yes, I did</button><button class="btn ghost" type="button" data-no>Not yet</button></div>';
      fb.querySelector('[data-say2]').onclick = () => say(d.mo);
      app.querySelector('[data-reveal]').hidden = true;
      fb.querySelector('[data-yes]').onclick = () => result(it, true, '');
      fb.querySelector('[data-no]').onclick = () => result(it, false, '');
    };
  }
  function check(it) {
    let verdict;
    if (it.type === 'order') {
      const got = [...app.querySelectorAll('.dr-built button')].map(b => it.words[+b.dataset.w]);
      if (got.length < it.words.length) return;
      verdict = norm(got.join(' ')) === norm(it.words.join(' ')) ? 'ok' : 'no';
    } else {
      verdict = judge(it, app.querySelector('.dr-in').value);
      if (verdict === null) return;
      if (verdict === 'same') { const fb = app.querySelector('.dr-fb'); fb.hidden = false; fb.className = 'dr-fb'; fb.innerHTML = '<p>That is the sentence with the mistake. Change something first.</p>'; return; }
    }
    result(it, verdict !== 'no', verdict === 'typo' ? 'Nearly perfect: check the spelling.' : '');
  }
  function answer(it) {
    const d = it.d;
    if (it.type === 'say') return d.sit.a[0];
    if (it.type === 'form') return d.fo[it.i].t.replace('___', '<b>' + esc(d.fo[it.i].a[0]) + '</b>');
    if (it.type === 'fix') return esc(d.fx.r[0]) + '<small>' + esc(d.fx.y) + '</small>';
    if (it.type === 'order') return esc(d.ex);
    return '';
  }
  function result(it, ok, note) {
    const d = it.d, secs = (Date.now() - it.t0) / 1000, retry = R.retried.has(R.n);
    app.querySelectorAll('.dr-card button:not(.icon), .dr-in').forEach(x => x.disabled = true);
    let pts = 0;
    if (ok) { pts = Math.max(2, 10 - 3 * it.hint + (secs < 15 ? 2 : 0)); R.combo++; if (R.combo % 5 === 0) pts += 5; if (!retry) R.right++; }
    else R.combo = 0;
    if (!retry) { R.score += pts; R.asked++; }
    if (!R.graded.has(it.s) && !retry) { R.graded.add(it.s); HWE.grade(it.s, ok); }
    if (ok && !it.hint && !retry) { const before = HWE.level(HWE.get(it.s)); const l = HWE.master(it.s, it.type); if (l > before) R.up[it.s] = l; }
    else HWE.practised(it.s);
    if (!ok && !retry) { R.q.push({ ...it }); R.retried.add(R.q.length - 1); }
    const fb = app.querySelector('.dr-fb'); fb.hidden = false; fb.className = 'dr-fb ' + (ok ? 'ok' : 'no');
    const ans = answer(it);
    fb.innerHTML = '<p class="dr-verdict">' + (ok ? 'Correct! ' + (pts && !retry ? '+' + pts : '') : 'Not quite.') + '</p>' + (note ? '<p>' + note + '</p>' : '')
      + (!ok && ans ? '<p>Answer: ' + (it.type === 'say' ? '<b>' + esc(ans) + '</b>' : ans) + '</p>' : ok && it.type === 'fix' ? '<p>' + ans + '</p>' : '')
      + (!ok ? '<p class="dr-help"><b>' + esc(d.p) + '</b>: ' + esc(d.mean) + (retry ? '' : ' It comes back at the end of this round.') + ' <a href="phrase/' + it.s + '.html" target="_blank" rel="noopener">Open the lesson</a></p>' : '')
      + (!ok && it.type !== 'order' && it.type !== 'speak' ? '<button class="linkish" type="button" data-mine>I think mine was right</button>' : '')
      + '<div class="dr-actions"><button class="btn" type="button" data-next>' + (R.n + 1 < R.q.length ? 'Next' : 'Finish') + '</button></div>';
    const nb = fb.querySelector('[data-next]'); nb.focus();
    nb.onclick = () => { R.n++; next(); };
    const mine = fb.querySelector('[data-mine]');
    if (mine) mine.onclick = () => { R.q.pop(); R.retried.delete(R.q.length); R.combo = 1; R.score += 6; R.right++; HWE.grade(it.s, true); HWE.master(it.s, it.type); mine.outerHTML = '<p class="dr-help">Counted as right. Thanks!</p>'; };
    if (ok && it.type === 'speak') { R.n++; next(); }
  }
  function end() {
    clearInterval(R.tick);
    const m = HWE.finished(R.score), ups = Object.keys(R.up);
    app.innerHTML = '<div class="dr-card dr-end"><h2>' + (R.right === R.asked ? 'Perfect round!' : 'Round done!') + '</h2>'
      + '<div class="dr-stats"><span><b>' + R.score + '</b>points</span><span><b>' + R.right + '/' + R.asked + '</b>right</span><span><b>' + clock() + '</b>time</span><span><b>' + (m.streak || 1) + '</b>day streak</span><span><b>' + m.best + '</b>best</span></div>'
      + (ups.length ? '<h3>Mastery up</h3><ul class="dr-ups">' + ups.map(s => '<li><a href="phrase/' + s + '.html">' + esc(by[s].p) + '</a> <span class="dots">' + HWE.dots(R.up[s]) + '</span>' + (R.up[s] === 3 ? ' mastered!' : '') + '</li>').join('') + '</ul>' : '')
      + '<p class="dr-help">Come back tomorrow: a phrase only levels up once a day, so daily rounds are how you master them.</p>'
      + '<div class="dr-actions"><button class="btn" type="button" data-again>Another round</button><button class="btn ghost" type="button" data-home>Done</button></div></div>';
    app.querySelector('[data-again]').onclick = () => play(R.topic);
    app.querySelector('[data-home]').onclick = home;
    const t = document.getElementById('promo'); if (t) app.appendChild(t.content.cloneNode(true));
    HWE.paint();
  }
  if (canSpeak) speechSynthesis.getVoices();   // starts loading the voices
  home();
})();
