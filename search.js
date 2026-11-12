const q = document.getElementById('q');
const chips = [...document.querySelectorAll('.chips button')];
const cards = [...document.querySelectorAll('.card')];
const letters = [...document.querySelectorAll('section[data-letter]')];
const empty = document.getElementById('empty');
let kind = 'all';
function run() {
  const t = q.value.trim().toLowerCase();
  let shown = 0;
  cards.forEach(c => {
    const ok = (kind === 'all' || c.dataset.kind === kind) && (!t || c.dataset.text.includes(t));
    c.hidden = !ok; if (ok) shown++;
  });
  letters.forEach(s => { s.hidden = !s.querySelector('.card:not([hidden])'); });
  empty.hidden = shown > 0;
}
q.addEventListener('input', run);
chips.forEach(b => b.addEventListener('click', () => {
  kind = b.dataset.kind;
  chips.forEach(x => x.setAttribute('aria-pressed', x === b));
  run();
}));
