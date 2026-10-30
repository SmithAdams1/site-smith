// Homepage: case-study carousel (pages by one card, works without motion).
(function () {
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

  // ---- testimonials: Read more on quotes clamped to six lines ----
  var pt = /^\/pt(\/|$)/.test(location.pathname);
  document.querySelectorAll('.rd-quote').forEach(function (q) {
    var p = q.querySelector(':scope > p');
    if (!p || q.querySelector('.rd-quote__more')) return;
    if (p.scrollHeight <= p.clientHeight + 2) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'rd-quote__more';
    b.textContent = pt ? 'Ler mais' : 'Read more';
    b.addEventListener('click', function () {
      var open = q.classList.toggle('is-open');
      b.textContent = open ? (pt ? 'Ler menos' : 'Show less') : (pt ? 'Ler mais' : 'Read more');
    });
    p.insertAdjacentElement('afterend', b);
  });
})();
