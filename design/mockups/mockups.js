// Scale the fixed-size frames to the window, and sprinkle pixel confetti.
function fit() {
  if (new URLSearchParams(location.search).get('solo')) return;
  const z = Math.min(1, (document.documentElement.clientWidth - 48) / 1600);
  document.querySelectorAll('.frame').forEach(f => f.style.setProperty('--z', z));
}
addEventListener('resize', fit);
fit();

document.querySelectorAll('[data-confetti]').forEach(box => {
  let s = Number(box.dataset.seed || 7);
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const colors = ['#F7C52B', '#FF6FA8', '#7A3CF0', '#2DBE6C', '#2F7DE1', '#FFFFFF'];
  const [w, h, n] = box.dataset.confetti.split(',').map(Number);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    const size = 8 + Math.floor(rnd() * 3) * 4;
    d.className = 'confetti';
    d.style.cssText = `left:${Math.floor(rnd() * w)}px;top:${Math.floor(rnd() * h)}px;width:${size}px;` +
      `height:${size * (rnd() < .5 ? 1 : 2)}px;background:${colors[Math.floor(rnd() * colors.length)]};` +
      `transform:rotate(${Math.floor(rnd() * 4) * 15}deg)`;
    box.appendChild(d);
  }
});

// ?solo=N shows only the N-th frame at 100% (used for full-size screenshots).
const solo = new URLSearchParams(location.search).get('solo');
if (solo) {
  document.body.style.padding = '0';
  document.body.style.background = 'transparent';
  document.querySelectorAll('body > *:not(script)').forEach(el => { el.style.display = 'none'; });
  const target = document.querySelectorAll('.frame, .phone')[Number(solo) - 1];
  let el = target;
  while (el.parentElement && el.parentElement !== document.body) el = el.parentElement;
  el.style.display = '';
  if (el !== target) {
    el.querySelectorAll('.phone-wrap').forEach(w => { if (!w.contains(target)) w.style.display = 'none'; });
    el.querySelectorAll('.label, .note').forEach(n => { n.style.display = 'none'; });
    el.style.padding = '16px';
  }
  const soloFit = () => document.querySelectorAll('.frame').forEach(f =>
    f.style.setProperty('--z', Math.min(1, document.documentElement.clientWidth / 1600)));
  addEventListener('resize', soloFit);
  soloFit();
}

// UI sounds (JDSherbert UI SFX + Landlord hits). Browsers only allow audio after the first click.
const SFX = {};
const sfx = name => {
  const a = (SFX[name] ||= new Audio(`../assets/audio/${name}`));
  a.currentTime = 0;
  a.volume = 0.5;
  a.play().catch(() => {});
};
const CLICKABLE = '.btn, .tile, .opt, .p-btn, .swatch, .tile-link';
document.addEventListener('mouseover', e => {
  const el = e.target.closest(CLICKABLE);
  if (el && !el.contains(e.relatedTarget)) sfx('ui_hover.ogg');
});
document.addEventListener('click', e => {
  const el = e.target.closest(CLICKABLE);
  if (!el) return;
  if (el.classList.contains('btn-off')) return sfx('ui_error.ogg');
  if (el.matches('.opt.correct')) return sfx('sword_swing.wav');
  sfx(/BACK|CHANGE/.test(el.textContent) ? 'ui_back.ogg' : 'ui_select.ogg');
});
