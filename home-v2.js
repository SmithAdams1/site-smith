// Homepage v2 preview: variant switcher + case-study carousel.
// data-variant itself is set by an inline script in <head>, before first paint.
(function () {
  var VARIANTS = ['a', 'b', 'c'];
  var root = document.documentElement;

  // ---- variant switcher (preview only) ----
  var bar = document.createElement('div');
  bar.className = 'hv-switch';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Design variant');
  bar.innerHTML = '<span>Variant</span>' + VARIANTS.map(function (v) {
    return '<button type="button" data-v="' + v + '">' + v.toUpperCase() + '</button>';
  }).join('');
  document.body.appendChild(bar);
  function mark() {
    var cur = root.getAttribute('data-variant');
    bar.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-v') === cur ? 'true' : 'false');
    });
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var v = b.getAttribute('data-v');
    root.setAttribute('data-variant', v);
    var u = new URL(location.href);
    u.searchParams.set('variant', v);
    history.replaceState(null, '', u);
    mark();
    syncCases();
  });
  mark();

  // ---- case-study carousel: pages by one card, works without motion ----
  var track = document.querySelector('.hv-cases__track');
  var prev = document.querySelector('.hv-cases__btns [data-dir="-1"]');
  var next = document.querySelector('.hv-cases__btns [data-dir="1"]');
  function step() {
    var card = track.querySelector('.hv-case');
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
  }
  function syncCases() {
    if (!track) return;
    var max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
    var hide = max <= 0;
    prev.parentNode.style.visibility = hide ? 'hidden' : '';
  }
  if (track) {
    var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    [prev, next].forEach(function (btn) {
      btn.addEventListener('click', function () {
        track.scrollBy({ left: step() * +btn.getAttribute('data-dir'), behavior: smooth ? 'smooth' : 'auto' });
      });
    });
    track.addEventListener('scroll', function () {
      clearTimeout(track._t);
      track._t = setTimeout(syncCases, 80);
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });
    window.addEventListener('resize', syncCases);
    syncCases();
  }
})();
