/* ============================================================
   Smith & Adams — motion layer (zero dependencies)
   ------------------------------------------------------------
   Deliberately vanilla. The reveal work here is IntersectionObserver +
   CSS transitions on transform/opacity only, which is ~1kb instead of
   ~35kb of GSAP + ScrollTrigger. GSAP is only worth loading if/when a
   pinned scrollytelling section lands — and then only on that page.

   Responsibilities:
     1. Upgrade the pre-existing .custom-fade-in system to be
        compositor-friendly (it used `transition: all` + `filter: blur`,
        which forces repaints and is the main source of scroll jank).
     2. Drive [data-reveal] / [data-reveal-mask] / [data-reveal-lines].
     3. Layered parallax on decorative media (rAF, transform only).
     4. Pause off-screen video; respect reduced motion and saveData.
     5. Rebuild after cms-loader injects content.
   ============================================================ */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection;
  var saveData = !!(conn && conn.saveData);

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';   // --sa-ease-out-expo

  // ----------------------------------------------------------
  // 1. Upgrade the existing .custom-fade-in sections
  // ----------------------------------------------------------
  // The pre-animation state for these now lives in motion.css under `.js`
  // (applied before paint, so no flash, and content is fully visible when
  // JS is off). The inline `transition: all` + `filter: blur(4px)` were
  // stripped from the HTML — they repainted a whole section every frame.
  //
  // We also take over REVEALING them. The page's own observer uses
  // `threshold: 0.2`, which never fires for a section taller than ~5x the
  // viewport — 20% of its height simply cannot be on screen at once. That
  // was survivable when the pre-state was 40% opacity (content stayed
  // readable), but with a proper 0-opacity pre-state it would leave tall
  // sections permanently invisible.
  //
  // So: threshold 0 with a bottom rootMargin, which fires as soon as any
  // part of the element enters. The page's observer still runs and sets the
  // same inline values — harmless and idempotent.
  var legacyObserver = null;

  function revealLegacy(el) {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    el.style.filter = 'none';
  }

  function upgradeLegacyFades() {
    var els = document.querySelectorAll('.custom-fade-in:not([data-sa-upgraded])');
    if (!els.length) return;

    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.dataset.saUpgraded = '1';

      if (reduce) {
        el.style.transition = 'none';
        revealLegacy(el);
        continue;
      }

      el.style.willChange = 'opacity, transform';
      el.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'opacity') e.currentTarget.style.willChange = 'auto';
      });

      if (!legacyObserver) {
        legacyObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            revealLegacy(entry.target);
            legacyObserver.unobserve(entry.target);
          });
        }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
      }
      legacyObserver.observe(el);
    }
  }

  // ----------------------------------------------------------
  // 2. Reveal system for new markup
  // ----------------------------------------------------------
  var revealObserver = null;

  function revealTargets() {
    return document.querySelectorAll(
      '[data-reveal]:not(.sa-revealed), [data-reveal-mask]:not(.sa-revealed), [data-reveal-lines]:not(.sa-revealed)'
    );
  }

  function applyReveal(el) {
    var delay = parseFloat(el.dataset.revealDelay || '0');
    var dur = parseFloat(el.dataset.revealDuration || '0.85');

    if (el.hasAttribute('data-reveal-lines')) {
      // Stagger direct children — 60ms apart reads as one considered
      // gesture. Beyond ~8 children the tail starts to feel laggy, so
      // the step tightens as the count grows.
      var kids = el.children;
      var step = kids.length > 8 ? 0.04 : 0.06;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        k.style.transition = 'opacity ' + dur + 's ' + EASE + ', transform ' + dur + 's ' + EASE;
        k.style.transitionDelay = (delay + i * step) + 's';
        k.style.opacity = '1';
        k.style.transform = 'none';
      }
    } else if (el.hasAttribute('data-reveal-mask')) {
      // The closed clip is installed HERE, not in the CSS pre-state. A
      // clip-collapsed element has a zero-height visual rect, and Chrome's
      // IntersectionObserver then reports ratio 0 for it permanently — with
      // the clip in the pre-state the reveal simply never fires. So: close
      // the curtain, flush that state, then open it.
      el.style.transition = 'none';
      el.style.clipPath = 'inset(0 0 100% 0)';
      void el.offsetHeight;                    // force the closed state to land
      el.style.transition = 'clip-path ' + (dur * 1.2) + 's ' + EASE + ', opacity ' + (dur * 0.6) + 's ease-out';
      el.style.transitionDelay = delay + 's';
      // Drop the clip once it has finished opening. `inset(0 0 0 0)` still
      // clips to the border box, which would silently cut off anything a
      // child overflows later (hover shadows, dropdowns, focus rings).
      el.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'clip-path') e.currentTarget.style.clipPath = 'none';
      }, { once: true });
      el.style.clipPath = 'inset(0 0 0 0)';
      el.style.opacity = '1';
    } else {
      el.style.transition = 'opacity ' + dur + 's ' + EASE + ', transform ' + dur + 's ' + EASE;
      el.style.transitionDelay = delay + 's';
      el.style.opacity = '1';
      el.style.transform = 'none';
    }

    el.classList.add('sa-revealed');
  }

  function buildReveals() {
    var targets = revealTargets();
    if (!targets.length) return;

    if (reduce) {                     // land straight on the final state
      for (var i = 0; i < targets.length; i++) {
        targets[i].style.transition = 'none';
        applyReveal(targets[i]);
      }
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          applyReveal(entry.target);
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    }

    for (var j = 0; j < targets.length; j++) revealObserver.observe(targets[j]);
  }

  // ----------------------------------------------------------
  // 3. Parallax — decorative layers only
  // ----------------------------------------------------------
  // Small yPercent deltas (5-15) so foreground and background never
  // visibly desync. Never applied to body copy or interactive controls.
  var parallaxLayers = [];
  var parallaxTicking = false;

  function collectParallax() {
    parallaxLayers = [];
    if (reduce) return;
    var els = document.querySelectorAll('[data-parallax]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var depth = parseFloat(el.dataset.parallax) || 10;
      parallaxLayers.push({ el: el, depth: Math.min(Math.abs(depth), 18) });
    }
  }

  function updateParallax() {
    parallaxTicking = false;
    var vh = window.innerHeight;
    for (var i = 0; i < parallaxLayers.length; i++) {
      var layer = parallaxLayers[i];
      var rect = layer.el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;   // off-screen
      // -1 (below viewport) .. +1 (above viewport)
      var progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2);
      layer.el.style.transform = 'translate3d(0,' + (progress * layer.depth).toFixed(2) + '%,0)';
    }
  }

  function onScroll() {
    if (parallaxTicking || !parallaxLayers.length) return;
    parallaxTicking = true;
    requestAnimationFrame(updateParallax);
  }

  // ----------------------------------------------------------
  // 4. Video: don't decode what nobody can see
  // ----------------------------------------------------------
  function manageVideo() {
    var vids = document.querySelectorAll('video[loop], video[autoplay]');
    if (!vids.length) return;

    if (reduce || saveData) {
      for (var i = 0; i < vids.length; i++) {
        vids[i].removeAttribute('autoplay');
        try { vids[i].pause(); } catch (e) {}
      }
      return;
    }

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.paused) v.play().catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.05 });

    for (var j = 0; j < vids.length; j++) io.observe(vids[j]);
  }

  // ----------------------------------------------------------
  // 5. Shared-element page transition (property card -> detail hero)
  // ----------------------------------------------------------
  // The name is assigned at click time so it is only ever on one visible
  // element per page — duplicate names silently break View Transitions.
  function wireSharedElementNav() {
    if (reduce || !('startViewTransition' in document)) return;

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href*="/property/"], a[data-vt-link]');
      if (!link) return;
      document.querySelectorAll('[data-vt-hero]').forEach(function (el) {
        el.style.viewTransitionName = '';
      });
      var media = link.querySelector('img, video');
      if (media) media.style.viewTransitionName = 'sa-hero-media';
    }, true);
  }

  // ----------------------------------------------------------
  // Init / rebuild
  // ----------------------------------------------------------
  function init() {
    upgradeLegacyFades();
    buildReveals();
    collectParallax();
    manageVideo();
    wireSharedElementNav();

    if (parallaxLayers.length) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () { collectParallax(); onScroll(); });
      updateParallax();
    }
  }

  // Content injected by cms-loader.js lands AFTER first paint, so any
  // observers built before it would miss those nodes entirely.
  function rebuild() {
    upgradeLegacyFades();
    buildReveals();
    collectParallax();
    manageVideo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('cms-loaded', rebuild);

  // Late layout shifts (fonts, images) change element positions; re-run
  // parallax maths once things settle.
  window.addEventListener('load', function () { collectParallax(); onScroll(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { collectParallax(); onScroll(); });
  }
})();
