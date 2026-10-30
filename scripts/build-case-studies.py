#!/usr/bin/env python3
"""Build the static case-study pages: case-studies/<slug>.html (EN) and
pt/case-studies/<slug>.html (PT).

The shell (head, header, closing CTA, footer, scripts) is lifted from
index.html so the nav and footer stay in step with the rest of the site.
Only facts we can stand behind go in CASES; anything still waiting on
figures from the business stays out rather than being approximated.

    python3 scripts/build-case-studies.py
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CASES = [
    {
        'slug': 'hygge-residences-s-juliao',
        'logo_white': '/assets/brands/hygge-residences-white.png', 'logo': '/assets/brands/hygge-residences.png',
        'tags': ['Hospitality', 'Multi-unit', 'Restaurant'],
        'name': 'Hygge Residences S. Julião',
        'place': 'Baixa, Lisbon',
        'image': '/portfolio/s-juliao.webp',
        'alt': 'Living room of an apartment at Hygge Residences S. Julião, Lisbon',
        'lede': 'Twelve apartments and a restaurant in Baixa that we specified, delivered and still run.',
        'body': [
            'S. Julião brings the whole group into one building: the apartments were delivered to our own specification and are let and managed in-house under the Hygge Residences brand, alongside a restaurant we operate.',
            'The standard holds after handover, not only at it. Occupancy is ours to answer for, and it is reported on the same terms as every other asset we run.',
        ],
        'figs': [('Units', '12'), ('Restaurant', '1'), ('Occupancy', '85.2%'), ('Since', '2022')],
        'note': 'Occupancy measured from 6 August 2025 to 6 August 2026. Source: Boom, the platform the building is booked through.',
        'services': ['Investment Advisory', 'Real Estate', 'Property Management', 'Hospitality & F&B'],
    },
    {
        'slug': 'anjos-40',
        'logo_white': '/assets/brands/anjos-40-white.svg', 'logo': '/assets/brands/anjos-40.svg',
        'tags': ['Residential', 'Multi-unit'],
        'name': 'Anjos 40',
        'place': 'Anjos, Lisbon',
        'image': '/portfolio/anjos-40.webp',
        'alt': 'Dining room of an apartment at Anjos 40, Lisbon',
        'lede': 'Eight apartments held and let since 2021, with a cost line kept short.',
        'body': [
            'A smaller building costs less to run per unit, and steady occupancy is what makes that arithmetic work.',
            'Anjos 40 is managed to the same standard as everything else we run, and its net figure is published rather than described.',
        ],
        'figs': [('Units', '8'), ('Occupancy', '86.3%'), ('Since', '2021')],
        'note': 'Occupancy measured from 6 August 2025 to 6 August 2026. Source: Boom, the platform the building is booked through.',
        'services': ['Investment Advisory', 'Property Management'],
    },
    {
        'slug': 'hygge-house-picoas',
        'logo_white': '/assets/brands/hygge-house-white.png', 'logo': '/assets/brands/hygge-house.png',
        'tags': ['Hospitality', 'Restaurant'],
        'name': 'Hygge House Picoas',
        'place': 'Picoas, Lisbon',
        'image': '/portfolio/hygge-house-5.webp',
        'alt': 'Bedroom at Hygge House Picoas, Lisbon',
        'lede': 'Serviced apartments and food and beverage under one brand and one operator.',
        'body': [
            'Hygge House Picoas brings a stay and a table under the same roof. Nine units are run as serviced apartments, with food and beverage operated by the group.',
            'Owning the brand and the operation means the guest experience, the pricing and the costs are all decided in one place.',
        ],
        'figs': [('Units', '9'), ('Model', 'Stay + F&B')],
        'note': '',
        'services': ['Hospitality & F&B', 'Property Management'],
    },
    {
        'slug': 'hygge-kaffe',
        'logo_white': '/assets/brands/hygge-kaffe-white.png', 'logo': '/assets/brands/hygge-kaffe.png',
        'tags': ['Restaurants'],
        'name': 'Hygge Kaffe',
        'place': 'Lisbon',
        'image': '/assets/hygge-kaffe-1.jpg',
        'alt': 'Hygge Kaffe, Lisbon',
        'lede': 'Our own restaurant brand, built and run in-house across three locations.',
        'body': [
            'Hygge Kaffe is the group\'s own restaurant brand, opened in 2022 and run in-house across three Lisbon locations.',
            'It gives the group hands-on operating experience that we bring to every hospitality and branded-residence project we advise on.',
        ],
        'figs': [('Locations', '3'), ('Margin', '23%'), ('Since', '2022')],
        'note': '',
        'services': ['Hospitality & F&B'],
    },
]

# European Portuguese copy, keyed by slug. Names stay as they are (brands).
PT = {
    'hygge-residences-s-juliao': {
        'tags': ['Hotelaria', 'Vários apartamentos', 'Restaurante'],
        'place': 'Baixa, Lisboa',
        'alt': 'Sala de um apartamento no Hygge Residences S. Julião, Lisboa',
        'lede': 'Doze apartamentos e um restaurante na Baixa que especificámos, entregámos e continuamos a gerir.',
        'body': [
            'O S. Julião reúne todo o grupo num só edifício: os apartamentos foram entregues segundo a nossa própria especificação e são arrendados e geridos internamente com a marca Hygge Residences, a par de um restaurante que operamos.',
            'O padrão mantém-se depois da entrega, e não só no momento da entrega. A ocupação é da nossa responsabilidade e é reportada nos mesmos termos de todos os outros ativos que gerimos.',
        ],
        'figs': [('Unidades', '12'), ('Restaurante', '1'), ('Ocupação', '85,2%'), ('Desde', '2022')],
        'note': 'Ocupação medida entre 6 de agosto de 2025 e 6 de agosto de 2026. Fonte: Boom, a plataforma através da qual o edifício é reservado.',
    },
    'anjos-40': {
        'tags': ['Residencial', 'Vários apartamentos'],
        'place': 'Anjos, Lisboa',
        'alt': 'Sala de jantar de um apartamento no Anjos 40, Lisboa',
        'lede': 'Oito apartamentos detidos e arrendados desde 2021, com custos controlados.',
        'body': [
            'Um edifício mais pequeno custa menos a gerir por unidade, e é a ocupação estável que faz estas contas funcionar.',
            'O Anjos 40 é gerido com o mesmo padrão de tudo o que gerimos, e o seu resultado líquido é publicado, não apenas descrito.',
        ],
        'figs': [('Unidades', '8'), ('Ocupação', '86,3%'), ('Desde', '2021')],
        'note': 'Ocupação medida entre 6 de agosto de 2025 e 6 de agosto de 2026. Fonte: Boom, a plataforma através da qual o edifício é reservado.',
    },
    'hygge-house-picoas': {
        'tags': ['Hotelaria', 'Restaurante'],
        'place': 'Picoas, Lisboa',
        'alt': 'Quarto no Hygge House Picoas, Lisboa',
        'lede': 'Apartamentos com serviços e restauração, com uma só marca e um só operador.',
        'body': [
            'O Hygge House Picoas junta a estadia e a mesa debaixo do mesmo teto. Nove unidades funcionam como apartamentos com serviços, com a restauração operada pelo grupo.',
            'Ser dono da marca e da operação significa que a experiência do hóspede, os preços e os custos são decididos num só lugar.',
        ],
        'figs': [('Unidades', '9'), ('Modelo', 'Alojamento + restauração')],
        'note': '',
    },
    'hygge-kaffe': {
        'tags': ['Restauração'],
        'place': 'Lisboa',
        'alt': 'Hygge Kaffe, Lisboa',
        'lede': 'A nossa marca de restauração, criada e gerida internamente em três espaços.',
        'body': [
            'O Hygge Kaffe é a marca de restauração do próprio grupo, aberta em 2022 e gerida internamente em três espaços em Lisboa.',
            'Dá ao grupo uma experiência operacional direta, que levamos para cada projeto de hotelaria e de residências de marca em que aconselhamos.',
        ],
        'figs': [('Espaços', '3'), ('Margem', '23%'), ('Desde', '2022')],
        'note': '',
    },
}

SERVICE_PT = {'Investment Advisory': 'Consultoria de Investimento', 'Real Estate': 'Imobiliário',
              'Property Management': 'Gestão de Propriedades', 'Hospitality & F&B': 'Hotelaria e Restauração'}
SERVICE_URL_PT = {'Investment Advisory': '/pt/invest-in-portugal', 'Real Estate': '/pt/real-estate',
                  'Property Management': '/pt/property-management', 'Hospitality & F&B': '/hospitality'}

UI = {
    'en': {'cs': 'Case study', 'pdf': 'Download PDF', 'expert': 'Speak with an expert', 'contact': '/contact.html',
           'svcs': 'Services involved', 'more': 'More case studies', 'title': 'Case study'},
    'pt': {'cs': 'Caso de estudo', 'pdf': 'Descarregar PDF', 'expert': 'Fale com um especialista', 'contact': '/pt/contact',
           'svcs': 'Serviços envolvidos', 'more': 'Mais casos de estudo', 'title': 'Caso de estudo'},
}

SERVICE_URL = {
    'Investment Advisory': '/invest-in-portugal.html',
    'Real Estate': '/real-estate.html',
    'Property Management': '/property-management.html',
    'Hospitality & F&B': '/hospitality.html',
}

CSS = """
<style id="cs-css">
.cs-hero{position:relative;min-height:min(78vh,760px);display:flex;align-items:flex-end;background:var(--navy);overflow:hidden}
.cs-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cs-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,34,45,.6) 0%,rgba(17,34,45,.2) 30%,rgba(17,34,45,.55) 62%,rgba(17,34,45,.92) 100%)}
.cs-hero .rd-wrap{position:relative;z-index:1;width:100%;padding-bottom:clamp(40px,6vw,80px)}
.cs-hero .rd-label{color:var(--stone)}
.cs-hero h1{color:#fff;font-family:var(--display);font-weight:500;font-size:clamp(36px,5.4vw,80px);letter-spacing:-0.015em;line-height:1.04;margin:14px 0 0}
.cs-logo{display:block;height:clamp(34px,4vw,48px);width:auto;max-width:60%;margin:0 0 18px}
.cs-tags{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 0}
.cs-tags span{font:600 11px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:#fff;border:1px solid rgba(255,255,255,.35);padding:6px 10px;border-radius:2px}
.cs-hero p{color:var(--stone);font-family:var(--sans);font-weight:300;font-size:clamp(17px,1.5vw,21px);max-width:52ch;margin:18px 0 0}
.cs-main{padding:clamp(48px,6vw,88px) 0;background:var(--paper)}
.cs-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:clamp(32px,6vw,96px);align-items:start}
.cs-body p{font-family:var(--sans);font-size:clamp(16px,1.2vw,18px);line-height:1.8;color:var(--ink);margin:0 0 20px;max-width:62ch}
.cs-figs{margin:0;border-top:1px solid var(--navy)}
.cs-figs div{display:flex;justify-content:space-between;align-items:baseline;padding:16px 0;border-bottom:1px solid var(--line)}
.cs-figs dt{font-family:var(--sans);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--slate)}
.cs-figs dd{margin:0;font-family:var(--display);font-size:clamp(24px,2.2vw,32px);color:var(--navy)}
.cs-note{font-family:var(--sans);font-size:12.5px;line-height:1.6;color:var(--slate);margin:14px 0 0}
.cs-svcs{margin-top:36px}
.cs-svcs ul{list-style:none;margin:12px 0 0;padding:0}
.cs-svcs li{border-bottom:1px solid var(--line)}
.cs-svcs a{display:flex;justify-content:space-between;padding:12px 0;color:var(--navy);text-decoration:none;font-family:var(--sans);font-weight:500;font-size:15px}
.cs-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:36px}
.cs-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 24px;border-radius:2px;font-family:var(--sans);font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;border:1px solid var(--navy)}
.cs-btn--solid{background:var(--navy);color:#fff}
.cs-btn--line{background:transparent;color:var(--navy)}
.cs-more{border-top:1px solid var(--line);padding-top:clamp(40px,5vw,64px);margin-top:clamp(48px,6vw,88px)}
.cs-more ul{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.cs-more a{color:var(--navy);text-decoration:none;font-family:var(--display);font-size:20px}
.cs-more span{display:block;font-family:var(--sans);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--slate);margin-bottom:6px}
.cs-print-head,.cs-print-foot{display:none}
@media (max-width:860px){.cs-grid,.cs-more ul{grid-template-columns:1fr}}
/* Download PDF = the browser's Save as PDF on this stylesheet: one clean
   page, no nav, footer, widgets or animation. */
@media print{
  @page{size:A4;margin:16mm}
  header,footer,.rd-close,.cs-actions,.cs-more,.sa-nl,#sa-consent,#sa-btn-wrap,#sa-win,iframe{display:none!important}
  body{background:#fff!important}
  .cs-print-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10mm;font-family:var(--sans);font-size:10pt;color:var(--slate)}
  .cs-print-head img{height:9mm}
  .cs-hero{min-height:0;height:95mm;break-inside:avoid}
  .cs-hero::after{background:linear-gradient(180deg,transparent 30%,rgba(17,34,45,.85) 100%)}
  .cs-hero,.cs-hero::after{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cs-hero .rd-wrap{padding:0 8mm 8mm!important}
  .cs-main{padding:10mm 0 0}
  .rd-wrap{padding:0!important}
  .cs-grid{grid-template-columns:1.3fr 1fr;gap:10mm}
  .reveal{opacity:1!important;transform:none!important}
  .cs-print-foot{display:block;margin-top:10mm;padding-top:4mm;border-top:1px solid var(--line);font-family:var(--sans);font-size:9pt;color:var(--slate)}
}
</style>"""


def esc(s):
    return html.escape(s, quote=True)


def shell():
    src = (ROOT / 'index.html').read_text().split('\n')
    hero = next(n for n, l in enumerate(src) if 'class="rd-hero"' in l) - 1
    close = next(n for n, l in enumerate(src) if 'CLOSING' in l)
    head, tail = '\n'.join(src[:hero]), '\n'.join(src[close:])
    # Pages live one level down: every relative asset/link must be rooted.
    fix = lambda s: re.sub(r'(href|src|srcSet|srcset)="\./', r'\1="/',
                           re.sub(r'(href|src)="((?:_next/|favicon)[^"]*|[a-z0-9-]+\.html)"', r'\1="/\2"', s))
    return fix(head), fix(tail)


def loc(c, lang):
    """The case in one language: PT fields override the EN ones."""
    return {**c, **PT[c['slug']]} if lang == 'pt' else c


def page(c0, head, tail, lang='en'):
    c, U = loc(c0, lang), UI[lang]
    pre = '/pt' if lang == 'pt' else ''
    en_url = f'https://www.smithandadams.com/case-studies/{c["slug"]}'
    pt_url = f'https://www.smithandadams.com/pt/case-studies/{c["slug"]}'
    url = pt_url if lang == 'pt' else en_url
    title = f'{c["name"]} | {U["title"]} | Smith &amp; Adams'
    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head, count=1)
    h = re.sub(r'<meta name="description"[^>]*>', f'<meta name="description" content="{esc(c["lede"])}" />', h, count=1)
    # noindex until the figures and photos are confirmed; alternates already wired.
    h = re.sub(r'<link rel="canonical"[^\n]*',
               '<meta name="robots" content="noindex, nofollow" />'
               f'<link rel="alternate" hreflang="en" href="{en_url}"/><link rel="alternate" hreflang="pt" href="{pt_url}"/>', h, count=1)
    h = re.sub(r'<meta property="og:url"[^>]*>', f'<meta property="og:url" content="{url}" />', h, count=1)
    h = re.sub(r'<meta property="og:title"[^>]*>', f'<meta property="og:title" content="{title}" />', h, count=1)
    h = re.sub(r'<meta property="og:description"[^>]*>', f'<meta property="og:description" content="{esc(c["lede"])}" />', h, count=1)
    h = re.sub(r'<script type="application/ld\+json">.*?</script>', '', h, flags=re.S)
    h = re.sub(r'<link rel="preload" as="image"[^>]*>', f'<link rel="preload" as="image" href="{c["image"]}" fetchpriority="high"/>', h, count=1)
    if lang == 'pt':
        h = h.replace('<html lang="en"', '<html lang="pt"')
    h = h.replace('</head>', CSS + '\n</head>', 1)

    figs = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in c['figs'])
    note = f'<p class="cs-note">{esc(c["note"])}</p>' if c['note'] else ''
    body = ''.join(f'<p class="reveal">{esc(p)}</p>' for p in c['body'])
    sname = (lambda x: SERVICE_PT[x]) if lang == 'pt' else (lambda x: x)
    surl = SERVICE_URL_PT if lang == 'pt' else SERVICE_URL
    svcs = ''.join(f'<li><a href="{surl[s]}">{esc(sname(s))} <span aria-hidden="true">&rarr;</span></a></li>' for s in c['services'])
    others = ''.join(
        f'<li><a href="{pre}/case-studies/{o["slug"]}"><span>{esc(loc(o, lang)["place"])}</span>{esc(o["name"])}</a></li>'
        for o in CASES if o is not c0)
    main = f'''        <!-- ══════════════════ CASE STUDY · {esc(c["name"])} ({lang}) ══════════════════ -->
        <div class="cs-print-head"><img src="/logo.png" alt="Smith &amp; Adams"><span>{U["cs"]} &middot; smithandadams.com</span></div>
        <section class="cs-hero">
            <img src="{c["image"]}" alt="{esc(c["alt"])}" fetchpriority="high" decoding="async">
            <div class="rd-wrap">
                <img class="cs-logo" src="{c["logo_white"]}" alt="{esc(c["name"])} logo">
                <p class="rd-label">{U["cs"]} &middot; {esc(c["place"])}</p>
                <h1>{esc(c["name"])}</h1>
                <p>{esc(c["lede"])}</p>
                <div class="cs-tags">{"".join(f"<span>{esc(t)}</span>" for t in c["tags"])}</div>
            </div>
        </section>
        <section class="cs-main">
            <div class="rd-wrap">
                <div class="cs-grid">
                    <div class="cs-body">{body}
                        <div class="cs-actions">
                            <button class="cs-btn cs-btn--solid" type="button" onclick="window.print()">{U["pdf"]}</button>
                            <a class="cs-btn cs-btn--line" href="{U["contact"]}">{U["expert"]}</a>
                        </div>
                    </div>
                    <aside>
                        <dl class="cs-figs">{figs}</dl>{note}
                        <div class="cs-svcs"><p class="rd-label">{U["svcs"]}</p><ul>{svcs}</ul></div>
                    </aside>
                </div>
                <p class="cs-print-foot">Smith &amp; Adams &middot; +351 938 227 348 / +351 214 086 709 &middot; geral@smithandadams.com &middot; www.smithandadams.com{pre}/case-studies/{c["slug"]}</p>
                <div class="cs-more">
                    <p class="rd-label">{U["more"]}</p>
                    <ul>{others}</ul>
                </div>
            </div>
        </section>

'''
    return h + '\n' + main + tail


def main():
    head, tail = shell()
    for lang, out in (('en', ROOT / 'case-studies'), ('pt', ROOT / 'pt' / 'case-studies')):
        out.mkdir(parents=True, exist_ok=True)
        for c in CASES:
            (out / f'{c["slug"]}.html').write_text(page(c, head, tail, lang))
            print('wrote', out.relative_to(ROOT) / f'{c["slug"]}.html')


if __name__ == '__main__':
    main()
