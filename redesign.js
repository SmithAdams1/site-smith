(function () {
      // ---- Nav: transparent over a dark hero, solid on scroll (runs always, even under reduced motion) ----
      (function () {
        var nav = document.querySelector('.rd-nav');
        if (!nav) return;
        var onScroll = function () {
          if ((window.scrollY || window.pageYOffset) > 40) nav.classList.add('rd-nav--solid');
          else nav.classList.remove('rd-nav--solid');
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      })();

      // ---- Properties dropdown: open on click/tap/keyboard as well as hover.
      //      Hover alone is unreliable (touch devices can't hover, and the
      //      "Properties" trigger points at "#", so a click did nothing) - which
      //      made Featured Opportunities / Property Management look broken. ----
      (function () {
        var dd = document.querySelector('.rd-dd');
        if (!dd) return;
        var trig = dd.querySelector('a');
        if (trig) {
          trig.addEventListener('click', function (e) {
            e.preventDefault();
            dd.classList.toggle('rd-dd--open');
          });
        }
        document.addEventListener('click', function (e) {
          if (!dd.contains(e.target)) dd.classList.remove('rd-dd--open');
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') dd.classList.remove('rd-dd--open');
        });
      })();

      // ---- Portfolio carousel (runs always: this is navigation, not decoration,
      //      so it must work under reduced motion and without GSAP) ----
      (function () {
        var track = document.getElementById('assetTrack');
        if (!track) return;
        var prev = document.getElementById('assetPrev');
        var next = document.getElementById('assetNext');
        var idxEl = document.getElementById('assetIdx');
        var slides = track.querySelectorAll('.rd-slide');
        var total = slides.length;
        var totalEl = document.getElementById('assetTotal');
        if (totalEl) totalEl.textContent = total;

        function current() {
          return Math.round(track.scrollLeft / track.clientWidth);
        }
        function sync() {
          var i = Math.max(0, Math.min(total - 1, current()));
          if (idxEl) idxEl.textContent = i + 1;
          if (prev) prev.disabled = i === 0;
          if (next) next.disabled = i === total - 1;
        }
        function go(dir) {
          // Honour reduced motion here too: jump rather than glide.
          var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          track.scrollTo({ left: (current() + dir) * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
        }
        if (prev) prev.addEventListener('click', function () { go(-1); });
        if (next) next.addEventListener('click', function () { go(1); });
        track.addEventListener('scroll', function () {
          window.clearTimeout(track._t);
          track._t = window.setTimeout(sync, 90);
        }, { passive: true });
        track.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        });
        window.addEventListener('resize', sync);
        sync();
      })();

      // ---- Bio panel over a portrait (runs always: it is the only way to reach
      //      the text, so it cannot depend on GSAP or on motion being allowed) ----
      (function () {
        var trigger = document.querySelector('.rd-msg__trigger');
        if (!trigger) return;
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) return;
        var figure = trigger.closest('.rd-msg__figure');
        // Only now does the bio become collapsible and the button appear.
        if (figure) figure.setAttribute('data-js', '1');
        function set(open) {
          trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (open) panel.setAttribute('data-open', '1');
          else panel.removeAttribute('data-open');
          panel.setAttribute('aria-hidden', open ? 'false' : 'true');
          if (open) panel.scrollTop = 0;
        }
        trigger.addEventListener('click', function () {
          set(trigger.getAttribute('aria-expanded') !== 'true');
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
            set(false);
            trigger.focus();
          }
        });
        set(false);
      })();

      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var hasGsap = window.gsap && window.ScrollTrigger;

      // ---- Cursor "wave": a large, soft light that EASES toward the pointer.
      //      The lag between cursor and light is what reads as flow/wave. White
      //      on navy, blue on white; applied to whole sections (the dispersed
      //      wave) and to cards (a tighter focal accent). Runs without GSAP but
      //      not under reduced motion. ----
      if (!reduce) {
        // Shared tracker: eases current position toward the pointer target and
        // applies it via `apply(x,y)`. rAF only runs while it still has to move.
        function attachWave(host, apply, opts) {
          opts = opts || {};
          var ease = opts.ease || 0.085;
          var tx = 50, ty = 50, cx = 50, cy = 50, raf = null, active = false;
          function loop() {
            cx += (tx - cx) * ease; cy += (ty - cy) * ease;
            apply(cx, cy);
            if (active || Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
              raf = requestAnimationFrame(loop);
            } else { raf = null; }
          }
          host.addEventListener('pointermove', function (e) {
            var r = host.getBoundingClientRect();
            tx = ((e.clientX - r.left) / r.width) * 100;
            ty = ((e.clientY - r.top) / r.height) * 100;
            active = true;
            if (opts.on) opts.on(true);
            if (!raf) raf = requestAnimationFrame(loop);
          }, { passive: true });
          host.addEventListener('pointerleave', function () {
            active = false;
            if (opts.on) opts.on(false);
          });
        }

        function isLight(el) {
          var m = (getComputedStyle(el).backgroundColor || '').match(/\d+(\.\d+)?/g);
          if (!m) return false;
          var opaque = (m[3] === undefined || parseFloat(m[3]) > 0.5);
          return opaque && (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 200;
        }
        function isDark(el) {
          var m = (getComputedStyle(el).backgroundColor || '').match(/\d+(\.\d+)?/g);
          if (!m) return false;
          var opaque = (m[3] === undefined || parseFloat(m[3]) > 0.5);
          return opaque && (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) < 110;
        }

        // Section-level dispersed wave (white on navy, blue on paper sections).
        (function () {
          var secs = document.querySelectorAll('.rd-sec');
          Array.prototype.forEach.call(secs, function (sec) {
            var navy = sec.classList.contains('rd-sec--navy');
            if (!navy && !isLight(sec)) return;           // skip image/other grounds
            var spot = document.createElement('div');
            spot.className = 'sa-spot' + (navy ? '' : ' sa-spot--blue');
            if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
            sec.insertBefore(spot, sec.firstChild);
            attachWave(sec, function (x, y) {
              spot.style.setProperty('--sx', x + '%');
              spot.style.setProperty('--sy', y + '%');
            }, { on: function (v) { spot.classList.toggle('on', v); } });
          });
        })();

        // Card-level focal glow, also eased.
        (function () {
          var blocks = document.querySelectorAll(
            '.rd-card, .rd-post, .re-card, .dev-projects-card, .dev-projects a[class*="rounded"]'
          );
          Array.prototype.forEach.call(blocks, function (el) {
            el.classList.add('rd-glow', isDark(el) ? 'rd-glow--light' : 'rd-glow--dark');
            attachWave(el, function (x, y) {
              el.style.setProperty('--gx', x + '%');
              el.style.setProperty('--gy', y + '%');
            }, { ease: 0.13, on: function (v) { el.classList.toggle('is-on', v); } });
          });
        })();
      }

      // Pages that render content after a fetch call this once the nodes are in
      // the DOM. Defined before the bail-out below so the call is always safe -
      // under reduced motion, or with GSAP blocked, it simply does nothing.
      window.rdReveal = function () {};

      if (reduce || !hasGsap) return; // content stays in its visible baseline state

      document.documentElement.classList.add('motion-ready');
      gsap.registerPlugin(ScrollTrigger);

      // ---- Lenis smooth scroll (the "single continuous surface") ----
      var lenis = null;
      if (window.Lenis) {
        lenis = new Lenis({ duration: 0.85, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      }

      var EASE = 'power3.out';

      // ---- Scroll-scrubbed flythrough hero (canvas frame-sequence: smooth on all browsers + mobile) ----
      (function () {
        var fly = document.querySelector('.rd-fly');
        if (!fly) return;

        // Mobile / touch: the pinned canvas scrub is janky on phones - the pin
        // fights the address-bar resize and the per-frame redraw stutters - and it
        // costs bandwidth. Show a static hero on the CSS poster instead: the intro
        // panel stays visible and the section scrolls away normally.
        var isTouch = window.matchMedia('(max-width: 900px)').matches
                   || window.matchMedia('(pointer: coarse)').matches;
        if (isTouch) {
          var p1m = fly.querySelector('.p1'); if (p1m) { p1m.style.opacity = '1'; p1m.style.transform = 'none'; }
          var p2m = fly.querySelector('.p2'); if (p2m) p2m.style.display = 'none';
          var p3m = fly.querySelector('.p3'); if (p3m) p3m.style.display = 'none';
          var cuem = fly.querySelector('.rd-scrollcue'); if (cuem) cuem.style.display = 'none';
          return;
        }

        var canvas = fly.querySelector('.rd-fly__canvas');
        var ctx = canvas.getContext('2d');
        var N = 120, current = 0, firstReady = false;
        var frames = new Array(N);
        var dpr = 1; // frames are 1280px; a >1 backing store only multiplies per-frame drawImage cost (Chrome scroll jank) with no real detail gain

        function pad(n){ n = String(n); while (n.length < 3) n = '0' + n; return n; }
        function sizeCanvas(){ canvas.width = Math.round(fly.clientWidth * dpr); canvas.height = Math.round(fly.clientHeight * dpr); }
        function paint(img){
          if (!img || !img.complete || !img.naturalWidth) return;
          var cw = canvas.width, ch = canvas.height;
          var ir = img.naturalWidth / img.naturalHeight, cr = cw / ch, dw, dh, dx, dy;
          if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
          else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
          ctx.drawImage(img, dx, dy, dw, dh);
        }
        function drawIndex(i){
          i = i < 0 ? 0 : i > N - 1 ? N - 1 : i;
          if (i === current && frames[i] && frames[i].complete && frames[i].naturalWidth) return; // same frame already on screen — skip the redundant drawImage
          var img = frames[i];
          if (img && img.complete && img.naturalWidth) { current = i; paint(img); return; }
          for (var d = 1; d < N; d++) {
            if (frames[i-d] && frames[i-d].complete && frames[i-d].naturalWidth) { paint(frames[i-d]); return; }
            if (frames[i+d] && frames[i+d].complete && frames[i+d].naturalWidth) { paint(frames[i+d]); return; }
          }
        }
        // Frames load in two passes instead of firing all 120 (6.9 MB) at once.
        // Pass 1 takes every 8th frame, so the flythrough becomes scrubable after
        // ~0.9 MB; drawIndex() already falls back to the nearest loaded frame, so
        // the sequence stays continuous, just coarse, until pass 2 fills it in.
        // The end result is identical — only the order of arrival changes.
        var conn = navigator.connection || {};
        var frugal = !!(conn.saveData || /(^|-)[23]g$/.test(conn.effectiveType || ''));
        var STEP = 8, MAX_INFLIGHT = 6;

        function loadFrame(idx, done) {
          if (frames[idx]) { if (done) done(); return; }
          var img = new Image();
          img.onload = function () {
            if (!firstReady) { firstReady = true; sizeCanvas(); drawIndex(0); }
            if (done) done();
          };
          img.onerror = function () { if (done) done(); };
          img.src = '/hero-frames/f_' + pad(idx + 1) + '.jpg?v=2';
          frames[idx] = img;
        }

        function fillRemaining() {
          // On saveData or 2G/3G we stop at the coarse pass: the poster behind the
          // canvas carries the hero, and nobody waits on 7 MB of stills.
          if (frugal) return;
          var queue = [];
          for (var i = 0; i < N; i++) if (!frames[i]) queue.push(i);
          var inflight = 0;
          (function pump() {
            while (inflight < MAX_INFLIGHT && queue.length) {
              inflight++;
              loadFrame(queue.shift(), function () { inflight--; pump(); });
            }
          })();
        }

        var coarse = [];
        for (var k = 0; k < N; k += STEP) coarse.push(k);
        if (coarse[coarse.length - 1] !== N - 1) coarse.push(N - 1);
        var pendingCoarse = coarse.length;
        coarse.forEach(function (i) {
          loadFrame(i, function () { if (--pendingCoarse === 0) fillRemaining(); });
        });
        window.addEventListener('resize', function () { sizeCanvas(); drawIndex(current); });

        var p1 = fly.querySelector('.p1'), p2 = fly.querySelector('.p2'), p3 = fly.querySelector('.p3');
        var cue = fly.querySelector('.rd-scrollcue');
        function c01(x){ return x < 0 ? 0 : x > 1 ? 1 : x; }
        function fin(p,a,b){ return c01((p - a) / (b - a)); }
        function fout(p,a,b){ return 1 - c01((p - a) / (b - a)); }
        function setPanel(el, op, dir){ el.style.opacity = op; el.style.transform = 'translateY(' + ((1 - op) * dir) + 'px)'; }

        ScrollTrigger.create({
          trigger: fly, start: 'top top', end: '+=2600', pin: true, scrub: 0.5, anticipatePin: 1,
          onUpdate: function (self) {
            var p = self.progress;
            drawIndex(Math.round(p * (N - 1)));
            setPanel(p1, fout(p, 0.20, 0.30), -20);
            setPanel(p2, Math.min(fin(p, 0.36, 0.44), fout(p, 0.60, 0.68)), 20);
            setPanel(p3, fin(p, 0.74, 0.82), 20);
            if (cue) cue.style.opacity = String(fout(p, 0.0, 0.05));
          }
        });
      })();

      // ---- Reveals (batched) ----
      ScrollTrigger.batch('.reveal', {
        start: 'top 88%',
        onEnter: function (els) {
          gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.08, overwrite: true });
        }
      });
      // ---- Reveals for content that arrives after a fetch ----
      // These cannot use the .reveal class: the CSS hides .reveal the moment
      // .motion-ready is set, so a listing the JS then failed to animate would
      // stay blank. They carry data-reveal instead and are hidden here, in the
      // same breath as being given their trigger - so a missed call leaves the
      // content visible rather than invisible.
      window.rdReveal = function (root) {
        var scope = (root && root.querySelectorAll) ? root : document;
        // Re-filtering the listings wipes the grid and builds it again, so the
        // triggers of the cards that just went away would pile up on detached
        // nodes. Drop those first.
        ScrollTrigger.getAll().forEach(function (st) {
          var el = st.trigger;
          if (el && el.hasAttribute && el.hasAttribute('data-reveal-done') && !document.contains(el)) st.kill();
        });
        var els = gsap.utils.toArray(scope.querySelectorAll('[data-reveal]:not([data-reveal-done])'));
        if (!els.length) return;
        els.forEach(function (el) { el.setAttribute('data-reveal-done', '1'); });
        gsap.set(els, { opacity: 0, y: 26 });
        ScrollTrigger.batch(els, {
          start: 'top 92%',
          onEnter: function (e) {
            gsap.to(e, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.06, overwrite: true });
          }
        });
        ScrollTrigger.refresh();
      };

      // staggered list lines
      gsap.utils.toArray('.rd-funcs').forEach(function (list) {
        ScrollTrigger.create({
          trigger: list, start: 'top 80%', once: true,
          onEnter: function () {
            gsap.to(list.querySelectorAll('.reveal-line'), { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.09 });
          }
        });
      });

      // ---- Parallax on asset media ----
      gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        var amt = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        gsap.fromTo(el, { yPercent: -amt * 100 }, {
          yPercent: amt * 100, ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      });

      // ---- Refresh after fonts/images settle (prevents mis-fired triggers) ----
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); }
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });

      // ---- Smooth in-page anchor via Lenis ----
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var id = a.getAttribute('href'); if (id.length < 2) return;
          var t = document.querySelector(id); if (!t) return;
          e.preventDefault();
          if (lenis) lenis.scrollTo(t, { offset: 0 }); else t.scrollIntoView({ behavior: 'smooth' });
        });
      });
    })();
