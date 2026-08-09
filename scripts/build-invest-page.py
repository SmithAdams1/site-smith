#!/usr/bin/env python3
"""Rebuild invest-in-portugal.html in the redesign system.

Head, <header> and <footer> are preserved byte for byte; only the content
region between them is rewritten. Every data-cms value is lifted out of the
current markup and re-injected, so the copy cannot drift through transcription.
"""
import importlib.util, re, sys, os

REPO = os.path.expanduser('~/Code/site-smith')
spec = importlib.util.spec_from_file_location('sync', os.path.join(REPO, 'scripts/sync-cms-fallbacks.py'))
sync = importlib.util.module_from_spec(spec); spec.loader.exec_module(sync)

PATH = os.path.join(REPO, 'invest-in-portugal.html')
src = open(PATH, encoding='utf-8').read()
head, rest = src.split('</header>', 1)
body, foot = rest.split('<footer', 1)
head += '</header>'
foot = '<footer' + foot

# ---- lift every data-cms value out of the current content region -------------
V, ATTRS = {}, {}
pos = 0
while True:
    m = re.compile(r'data-cms\s*=\s*"([^"]+)"').search(body, pos)
    if not m:
        break
    key = m.group(1)
    ts, name, oe = sync.open_tag_at(body, m.start())
    if not (ts < m.start() < oe) or name in ('script', 'style'):
        pos = m.end(); continue
    tag = body[ts:oe]
    kind = sync.kind_of(name, tag)
    ATTRS[key] = kind
    if kind in ('src', 'href', 'bg'):
        a = re.search(r'\s(?:src|href)\s*=\s*"([^"]*)"', tag)
        V[key] = a.group(1) if a else ''
        pos = oe
    else:
        close = sync.close_pos(body, name, oe)
        V[key] = body[oe:close].strip()
        pos = close

print(f'lifted {len(V)} values', file=sys.stderr)
missing = [k for k in V if not V[k]]
if missing:
    print('EMPTY:', missing, file=sys.stderr)


def T(key, attr=''):
    """data-cms attribute pair + the value, ready to drop into markup."""
    a = ' data-cms-attr="html"' if attr == 'html' else ''
    return f'data-cms="{key}"{a}', V[key]


def field(key, tag='p', cls='', style='', html=True):
    a, v = T(key, 'html' if html else '')
    c = f' class="{cls}"' if cls else ''
    s = f' style="{style}"' if style else ''
    return f'<{tag} {a}{c}{s}>{v}</{tag}>'


ICON = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')


def route(n, label_no):
    """One residency route: label, statement, intro, then its four attributes."""
    cells = []
    for r in range(4):
        la, lv = T(f'invest.programs.{n}.r{r}.label')
        ba, bv = T(f'invest.programs.{n}.r{r}.body', 'html')
        cells.append(
            f'''          <div class="rd-card reveal">
            <p {la} class="rd-label" style="margin:0 0 14px;">{lv}</p>
            <p {ba} style="margin:0;">{bv}</p>
          </div>''')
    ta, tv = T(f'invest.programs.{n}.tag')
    na, nv = T(f'invest.programs.{n}.title')
    ia, iv = T(f'invest.programs.{n}.intro', 'html')
    return f'''
      <section class="rd-sec" style="background:var(--paper);">
        <div class="rd-wrap">
          <hr class="rd-hair">
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            <p {ta} class="rd-label reveal" style="margin:0 0 22px;">{tv}</p>
            <h2 {na} class="rd-statement reveal" style="font-size:clamp(32px,4.6vw,64px); margin:0;">{nv}</h2>
            <p {ia} class="rd-body reveal" style="margin-top:26px;">{iv}</p>
          </div>
          <div class="rd-two" style="margin-top:clamp(32px,4vw,56px);">
{chr(10).join(cells)}
          </div>
        </div>
      </section>'''


# ---- hero -------------------------------------------------------------------
he, hev = T('invest.hero.eyebrow')
ht, htv = T('invest.hero.title')
hs, hsv = T('invest.hero.subtitle', 'html')

hero = f'''
      <section class="rd-hero">
        <div class="rd-hero__media">
          <img src="hygge-house-beato/atrium.jpg" alt="Hygge House Beato, Lisbon" loading="eager" decoding="async">
        </div>
        <div class="rd-hero__scrim"></div>
        <div class="rd-wrap rd-hero__inner">
          <p {he} class="rd-label" style="color:rgba(255,255,255,0.62); margin:0 0 26px;">{hev}</p>
          <h1 {ht}>{htv}</h1>
          <p {hs} class="rd-hero__sub">{hsv}</p>
          <div class="rd-hero__row">
            <a class="rd-cta" href="contact.html">Book a consultation {ICON}</a>
            <a class="rd-cta rd-cta--ghost" href="#invest-faq">Read the questions</a>
          </div>
        </div>
        <div class="rd-hero__caption">
          <span class="rd-label k">Beato · Lisboa</span>
          <span class="v">137 studio units</span>
        </div>
      </section>'''

# ---- the asset --------------------------------------------------------------
ge, gev = T('invest.hygge.eyebrow')
g1, g1v = T('invest.hygge.title_line1')
g2, g2v = T('invest.hygge.title_line2')
gb, gbv = T('invest.hygge.byline', 'html')
gt, gtv = T('invest.hygge.tag')
figs = []
for i in range(3):
    va, vv = T(f'invest.hygge.stat{i}.value')
    la, lv = T(f'invest.hygge.stat{i}.label')
    figs.append(f'<div class="f"><div class="n" {va}>{vv}</div><div class="l" {la}>{lv}</div></div>')

asset = f'''
      <section class="rd-asset">
        <div class="rd-asset__media">
          <img data-cms="invest.hygge.img0" src="{V['invest.hygge.img0']}" alt="Hygge House Beato" loading="lazy" decoding="async">
        </div>
        <div class="rd-asset__scrim"></div>
        <div class="rd-wrap rd-asset__plate">
          <p {gt} class="rd-label" style="color:rgba(255,255,255,0.6); margin:0 0 10px;">{gtv}</p>
          <p {ge} class="rd-label" style="color:rgba(255,255,255,0.6); margin:0 0 22px;">{gev}</p>
          <h2>{'{}'.format(f'<span {g1}>{g1v}</span> <em style="font-style:italic;" {g2}>{g2v}</em>')}</h2>
          <div class="rd-figs">{''.join(figs)}</div>
          <p {gb} class="rd-body" style="color:var(--stone); margin-top:26px;">{gbv}</p>
        </div>
      </section>'''

# ---- the project ------------------------------------------------------------
pl, plv = T('invest.hygge.project.label')
p1, p1v = T('invest.hygge.project.p1', 'html')
p2, p2v = T('invest.hygge.project.p2', 'html')
pq, pqv = T('invest.hygge.project.quote', 'html')
qa, qav = T('invest.hygge.quote', 'html')
i1, i2 = V['invest.hygge.img1'], V['invest.hygge.img2']

project = f'''
      <section class="rd-sec" style="background:var(--paper);">
        <div class="rd-wrap">
          <hr class="rd-hair">
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            <p {pl} class="rd-label reveal" style="margin:0 0 22px;">{plv}</p>
            <p {qa} class="rd-statement reveal" style="font-size:clamp(24px,3vw,40px); font-style:italic; font-weight:400; margin:0 0 32px;">{qav}</p>
            <p {p1} class="rd-body reveal" style="margin:0 0 22px;">{p1v}</p>
            <p {p2} class="rd-body reveal" style="margin:0;">{p2v}</p>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:clamp(12px,1.6vw,20px); margin-top:clamp(36px,5vw,64px);">
            <img data-cms="invest.hygge.img1" src="{i1}" alt="Hygge House Beato" loading="lazy" decoding="async" style="width:100%; aspect-ratio:4/3; object-fit:cover; display:block;">
            <img data-cms="invest.hygge.img2" src="{i2}" alt="Hygge House Beato" loading="lazy" decoding="async" style="width:100%; aspect-ratio:4/3; object-fit:cover; display:block;">
          </div>
          <p {pq} class="rd-statement reveal" style="font-size:clamp(22px,2.8vw,36px); font-style:italic; font-weight:400; margin:clamp(36px,5vw,64px) auto 0; max-width:24ch; text-align:center;">{pqv}</p>
        </div>
      </section>'''

# ---- pillars, on navy -------------------------------------------------------
kl, klv = T('invest.hygge.pillars.label')
kc, kcv = T('invest.hygge.pillars.closing', 'html')
rows = []
for i in range(5):
    a, v = T(f'invest.hygge.pillar{i}.body', 'html')
    rows.append(f'          <li class="reveal"><span class="fi">0{i+1}</span><span class="fd" {a} style="font-size:15px; color:var(--stone);">{v}</span></li>')

pillars = f'''
      <section class="rd-sec rd-sec--navy">
        <div class="rd-wrap">
          <p {kl} class="rd-label reveal" style="color:rgba(255,255,255,0.55); margin:0 0 clamp(28px,4vw,48px);">{klv}</p>
          <ul class="rd-funcs">
{chr(10).join(rows)}
          </ul>
          <p {kc} class="rd-body reveal" style="margin-top:clamp(32px,4vw,52px); max-width:70ch;">{kcv}</p>
        </div>
      </section>'''

# ---- FAQ --------------------------------------------------------------------
fe, fev = T('invest.faq.eyebrow')
ft, ftv = T('invest.faq.title')
qs = []
for i in range(8):
    qa_, qv = T(f'invest.faq.q{i}')
    aa_, av = T(f'invest.faq.a{i}', 'html')
    qs.append(f'''            <details>
              <summary><span {qa_}>{qv}</span><span class="rd-faq__mark" aria-hidden="true"></span></summary>
              <div class="rd-faq__a" {aa_}>{av}</div>
            </details>''')

faq = f'''
      <section class="rd-sec" id="invest-faq" style="background:var(--paper);">
        <div class="rd-wrap">
          <hr class="rd-hair">
          <div style="padding-top:clamp(28px,4vw,48px);">
            <p {fe} class="rd-label reveal" style="margin:0 0 22px;">{fev}</p>
            <h2 {ft} class="rd-statement reveal" style="font-size:clamp(30px,4vw,54px); margin:0 0 clamp(32px,4vw,56px); max-width:20ch;">{ftv}</h2>
          </div>
          <div class="rd-faq">
{chr(10).join(qs)}
          </div>
        </div>
      </section>'''

# ---- close ------------------------------------------------------------------
ca, cav = T('invest.cta.title')
close = f'''
      <section class="rd-sec rd-sec--navy">
        <div class="rd-wrap rd-close">
          <h2 {ca} style="color:#fff;">{cav}</h2>
          <div style="display:flex; justify-content:center; margin-top:36px;">
            <a data-cms="invest.cta.url" class="rd-cta" href="{V['invest.cta.url']}"><span data-cms="invest.cta.label">{V['invest.cta.label']}</span> {ICON}</a>
          </div>
        </div>
      </section>'''

# The FAQPage JSON-LD lives inside the content region, between the FAQ and the
# CTA. Carry it across verbatim — it is the AEO asset and must keep matching the
# visible answers word for word.
faq_ld = re.search(r'<script type="application/ld\+json">\s*\{"@context":"https://schema.org","@type":"FAQPage".*?</script>', body, re.S)
assert faq_ld, 'FAQPage block not found in the source'
faq = faq + '\n' + faq_ld.group(0)

content = '\n'.join([hero, route(0, '01'), route(1, '02'), asset, project, pillars, faq, close]) + '\n'

# ---- splice, and wire the page into the redesign system ---------------------
head = head.replace(
    '<script defer src="/cms-loader.js"></script>',
    '<link rel="stylesheet" href="/redesign.css">\n<script defer src="/cms-loader.js"></script>')
head = head.replace(
    'class="antialiased bg-[#FDFCF9] __variable_f367f3 __variable_646807 overflow-x-hidden w-full"',
    'class="antialiased bg-[#FDFCF9] __variable_f367f3 __variable_646807 overflow-x-hidden w-full rd rd-dark-hero"')
head = head.replace(
    '<header class="fixed w-full z-50 transition-all duration-300 bg-transparent">',
    '<header class="rd-nav fixed w-full z-50 transition-all duration-300">')

foot = foot.replace('<script src="/chat.js"></script>',
                    '<script src="/vendor/gsap.min.js"></script>\n'
                    '<script src="/vendor/ScrollTrigger.min.js"></script>\n'
                    '<script defer src="/redesign.js"></script>\n'
                    '<script src="/chat.js"></script>', 1)

out = head + '\n' + content + '\n' + foot
open(PATH, 'w', encoding='utf-8').write(out)
print(f'written: {len(out)} bytes', file=sys.stderr)
