/* Hero videos have to start on their own.
 *
 * Muted autoplay is permitted by every current browser, and yet it still fails
 * in the wild: macOS Low Power Mode and Chrome's Energy Saver suspend it, a
 * per-site auto-play setting can be off, a play() call racing a load() aborts,
 * and a rejected play() promise is silent because nobody is listening for it.
 * The pages used to call play() once and hope.
 *
 * This makes the attempt survivable. It keeps trying as the video becomes
 * ready, retries when the tab comes back, and only as a last resort starts on
 * the first interaction of any kind - a scroll, a key, a tap anywhere - so a
 * visitor never has to work out that they are meant to click the video.
 *
 * Opt in with data-autoplay. data-start-at="6" begins at six seconds.
 */
(function () {
  var vids = document.querySelectorAll('video[data-autoplay]');
  if (!vids.length) return;

  function arm(v) {
    // Set these on the element as well as in the markup: Safari reads the
    // properties at play() time, and a CMS-driven src swap rebuilds the media
    // state, which is exactly when a missing muted flag blocks the start.
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');

    var startAt = parseFloat(v.getAttribute('data-start-at') || '0');
    var seeded = false;
    var settled = false;

    function seed() {
      // The old code seeded on loadedmetadata and lost the seek when the
      // duration was not known yet, so the video silently began at zero.
      if (seeded || !startAt) return;
      if (v.readyState < 1 || !isFinite(v.duration) || !v.duration) return;
      seeded = true;
      try { v.currentTime = Math.min(startAt, Math.max(0, v.duration - 0.5)); } catch (e) {}
    }

    function attempt() {
      seed();
      if (settled || !v.paused) return;
      var p;
      try { p = v.play(); } catch (e) { return; }
      if (p && p.then) p.then(null, function () {}); // rejection is expected; the listeners below retry
    }

    // seed() has to run on its own and not only through attempt(): by the time
    // the duration is known the video is usually already playing, and attempt()
    // returns early on a playing video - which is how the old seek to six
    // seconds was being lost.
    function onReady() { seed(); attempt(); }
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(function (ev) {
      v.addEventListener(ev, onReady);
    });
    v.addEventListener('playing', function () { settled = true; release(); });
    // A src swap from the CMS starts the whole thing again.
    v.addEventListener('loadstart', function () { settled = false; seeded = false; });
    // Coming back from a background tab or a sleeping machine leaves it paused
    // with no event of its own.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) attempt();
    });

    var EVENTS = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];
    function onFirst() { attempt(); }
    function release() {
      EVENTS.forEach(function (e) { window.removeEventListener(e, onFirst); });
    }
    EVENTS.forEach(function (e) { window.addEventListener(e, onFirst, { passive: true }); });

    // onReady, not attempt: declarative autoplay may already have started the
    // video before this script ran, and the ready events would then be gone.
    onReady();
  }

  Array.prototype.forEach.call(vids, arm);
})();
