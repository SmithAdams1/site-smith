/** Build-time only. Replaces the runtime cdn.tailwindcss.com Play CDN, which
 *  generated utilities in JS after first paint — the cause of the sitewide
 *  restyle-on-load flicker. Scans every page and every script so JIT emits the
 *  same utilities the CDN did (arbitrary values included). preflight stays off
 *  to match the old `tailwind.config = { corePlugins:{ preflight:false } }`.
 *  Rebuild:  npx -y tailwindcss@3 -c scripts/tailwind.config.js \
 *              -i scripts/tailwind-input.css -o tailwind.css --minify
 */
module.exports = {
  content: ['./*.html', './*.js'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
}
