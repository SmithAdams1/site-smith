#!/usr/bin/env python3
"""Write the final navigation into the served HTML of every page.

WHY THIS EXISTS
---------------
cms-loader.js rebuilt the desktop nav on the client, after its Supabase fetch
resolved. Until then the browser painted whatever nav was in the HTML - which
was the OLD menu, different on every page (the homepage carried three items,
other pages carried "Property Management", "Our Developments", "Urban
Collection"). So every page transition showed the old menu for a moment and
then swapped it for the new one, which reads as though you have left the site
and landed on another.

Baking the final nav into the HTML fixes it at the source: the first paint is
already correct, there is nothing to swap, and crawlers and no-JS visitors get
the real menu instead of a stale one.

The nav is marked data-sa-rebuilt="1" so rebuildDesktopNav() returns early and
never touches it. That means it can no longer attach the dropdown's hover
handlers, so the dropdown is CSS-driven here - :hover plus :focus-within, which
also makes it keyboard-reachable, which the JS version never was.

    python3 scripts/bake-nav.py --dry-run
    python3 scripts/bake-nav.py --write
"""
import argparse, glob, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'admin.html', 'admin-real-estate.html', 'studio.html', 'page.html'}

LINK = 'text-white transition-colors duration-300 font-satoshi hover:text-gray-300 satoshi'
TOP = [('Home', '/index.html'), ('About Us', '/about.html')]
# "Our Services" dropdown - all business units, including Investments (the page
# still lives at /invest-in-portugal.html, but the tab is labelled "Investments").
SERVICES_LABEL = 'Our Services'
SERVICES_CUR = ('invest-in-portugal', 'real-estate', 'property-management', 'hospitality')
DROP = [('Investments', '/invest-in-portugal.html'),
        ('Real Estate', '/real-estate.html'),
        ('Property Management', '/property-management.html'),
        ('Hospitality', '/hospitality.html')]

STYLE = '''<style id="rd-nav-dd">
/* The Properties dropdown used to be opened by JS listeners attached during the
   client-side nav rebuild. The nav is now baked into the HTML, so the rebuild is
   skipped and the dropdown is driven by CSS instead. :focus-within is deliberate
   - it makes the menu reachable by keyboard, which the JS version was not. */
.rd-dd{position:relative}
.rd-dd__menu{position:absolute;left:0;top:100%;padding-top:16px;min-width:232px;
  opacity:0;visibility:hidden;transform:translateY(6px);
  transition:opacity .18s ease,visibility .18s ease,transform .18s ease;z-index:60}
.rd-dd:hover .rd-dd__menu,.rd-dd:focus-within .rd-dd__menu{opacity:1;visibility:visible;transform:none}
.rd-dd__inner{background:#11222D;border:1px solid rgba(255,255,255,.12);border-radius:2px;
  padding:6px;box-shadow:0 18px 44px rgba(17,34,45,.28)}
.rd-dd__item{display:block;padding:11px 16px;color:#fff;text-decoration:none;border-radius:2px;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;
  white-space:nowrap;transition:background .15s}
.rd-dd__item:hover,.rd-dd__item:focus-visible{background:rgba(255,255,255,.1)}
/* redesign.css paints every nav link navy with !important, which also hit the
   items inside this navy panel - the dropdown opened as an empty dark box on
   every page carrying the new header. These win it back. */
.rd-nav nav .rd-dd__item{color:#fff !important;opacity:1 !important;font-size:14px !important}
.rd-nav nav .rd-dd__item:hover{opacity:1 !important}
</style>'''


BTN = ('background:none;border:none;padding:2px 1px;cursor:pointer;font-family:inherit;'
       'font-size:13px;letter-spacing:.06em;color:inherit;transition:opacity .2s ease;')
SWITCHER = (
    '<div class="cms-lang-switcher" data-baked="1" style="display:inline-flex;align-items:center;'
    'gap:7px;margin-left:16px;font-family:inherit;color:#fff;">'
    f'<button type="button" data-locale="en" aria-label="English" style="{BTN}opacity:1;font-weight:600;">EN</button>'
    '<span style="opacity:.32;font-size:12px;">|</span>'
    f'<button type="button" data-locale="pt" aria-label="Portugu&ecirc;s" style="{BTN}opacity:.55;font-weight:500;">PT</button>'
    '</div>')
MOB_SWITCHER = SWITCHER.replace('margin-left:16px;', 'margin-left:0;margin-top:24px;')


MOB_LINK = 'text-2xl font-medium transition-colors duration-300 text-gray-300 hover:text-white satoshi'
MOB_ACTIVE = 'text-2xl font-medium transition-colors duration-300 text-white font-semibold satoshi'
MOB_CTA = ('bg-[#ffffff] text-[#0C1E28] px-6 py-3 rounded-[2px] font-medium '
           'transition-all duration-300 hover:bg-[#1a3240] mt-4 satoshi')
MOB = [('Home', '/index.html'), ('About Us', '/about.html'),
       ('Investments', '/invest-in-portugal.html'),
       ('Real Estate', '/real-estate.html'),
       ('Property Management', '/property-management.html'),
       ('Hospitality', '/hospitality.html'), ('Blog', '/blog.html')]


def build_mobile(cur):
    """Mirror the desktop order exactly. The old markup differed page to page -
    some carried Urban Collection, some had Real Estate appended by JS after the
    fetch - so the mobile menu flashed and disagreed with the desktop one."""
    out = []
    for label, href in MOB:
        active = href.strip('/').replace('.html', '') == cur
        out.append(f'<a class="{MOB_ACTIVE if active else MOB_LINK}" href="{href}">{label}</a>')
    out.append(f'<a class="{MOB_CTA}" href="/contact.html">Contact Us</a>')
    out.append(MOB_SWITCHER)
    return ''.join(out)


def top_link(label, href, cur):
    active = href.strip('/').replace('.html', '') == cur
    a_cls = LINK + (' font-semibold' if active else '')
    bar = 'w-full' if active else 'w-0 group-hover:w-full'
    return (f'<div class="relative group"><a class="{a_cls}" href="{href}">{label}</a>'
            f'<span class="absolute -bottom-1 left-0 h-0.5 bg-white rounded-full '
            f'transition-all duration-300 {bar}"></span></div>')


def build_nav(cur):
    parts = [top_link(l, h, cur) for l, h in TOP]
    child_active = cur in SERVICES_CUR
    trig_cls = LINK + (' font-semibold' if child_active else '')
    items = ''.join(f'<a class="satoshi rd-dd__item" href="{h}">{l}</a>' for l, h in DROP)
    parts.append(
        f'<div class="relative group rd-dd"><a class="{trig_cls}" href="#" '
        f'onclick="return false;" aria-haspopup="true">{SERVICES_LABEL} '
        f'<span style="font-size:.7em;vertical-align:middle;">&#9662;</span></a>'
        f'<div class="rd-dd__menu"><div class="rd-dd__inner" data-nav-group="services">'
        f'{items}</div></div></div>')
    parts.append(top_link('Blog', '/blog.html', cur))
    parts.append('<div><a class="bg-white text-[#0C1E28] px-6 py-3 rounded-[2px] font-medium '
                 'transition-all duration-300 hover:bg-opacity-90 satoshi" href="/contact.html">'
                 'Contact Us</a></div>')
    # Baked so the switcher is present at first paint. It used to be appended by
    # cms-loader after its fetch, which widened the nav by ~75px mid-load - the
    # "bump" on every page transition.
    parts.append(SWITCHER)
    return ''.join(parts)


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--dry-run', action='store_true')
    g.add_argument('--write', action='store_true')
    args = ap.parse_args()

    nav_open = re.compile(r'<nav class="hidden lg:flex[^"]*"[^>]*>', re.I)
    changed = 0
    for path in sorted(glob.glob(os.path.join(REPO, '*.html'))):
        name = os.path.basename(path)
        if name in SKIP:
            continue
        src = open(path, encoding='utf-8').read()
        m = nav_open.search(src)
        if not m:
            print(f'  {name:28} no desktop nav, skipped')
            continue
        # find the matching </nav>
        end = src.find('</nav>', m.end())
        if end == -1:
            print(f'  {name:28} unterminated <nav>, skipped', file=sys.stderr)
            continue
        cur = re.sub(r'\.html$', '', name) or 'index'
        new_open = '<nav class="hidden lg:flex items-center space-x-8" data-sa-rebuilt="1">'
        out = src[:m.start()] + new_open + build_nav(cur) + src[end:]

        # mobile menu: same items, same order, so the two never disagree
        mm = re.search(r'(<div id="mobile-menu".*?>\s*<div class="flex flex-col[^"]*">)(.*?)(</div>\s*</div>)',
                       out, re.S)
        if mm:
            out = out[:mm.start(2)] + build_mobile(cur) + out[mm.end(2):]
        if '<style id="rd-nav-dd">' not in out:
            out = out.replace('<header', STYLE + '\n<header', 1)
        if out != src:
            changed += 1
            print(f'  {name:28} nav baked ({len(src)} -> {len(out)} bytes)')
            if args.write:
                open(path, 'w', encoding='utf-8').write(out)
        else:
            print(f'  {name:28} already current')
    print(f'\n{changed} page(s) ' + ('written' if args.write else 'would change (dry run)'))


if __name__ == '__main__':
    main()
