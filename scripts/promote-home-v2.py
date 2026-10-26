#!/usr/bin/env python3
"""One-off: promote variant C of /home-v2 to the homepage.

- index.html (old)  -> home-v1.html (noindex, kept for comparison)
- index.html (new)  =  old head + header, the home-v2 sections, old tail
                       (testimonials, news, closing, footer), with every
                       new string tagged data-cms so /pt renders in PT and
                       the copy is editable in the CMS.
- home.css          =  home-v2.css reduced to the shared rules + variant C.
- prints the site_content rows (en + pt) as JSON for the upsert.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# key, EN (exactly as in the HTML), PT-PT
COPY = [
    ('home.hero.title', 'Property investment made easy.', 'Investimento imobiliário, simplificado.'),
    ('home.hero.sub', 'An independent real estate group providing end-to-end solutions for foreign investors in Portugal.',
     'Um grupo imobiliário independente com soluções completas para investidores estrangeiros em Portugal.'),
    ('home.cta.expert', 'Speak with an expert', 'Fale com um especialista'),
    ('home.stats.label', 'Track record', 'Resultados'),
    ('home.stats.title', 'Let the numbers speak for themselves.', 'Deixamos os números falar por si.'),
    ('home.stats.l1', 'Investors advised', 'Investidores aconselhados'),
    ('home.stats.l2', 'In advised investment value', 'Em valor de investimento aconselhado'),
    ('home.stats.l3', 'Assets under management', 'Ativos sob gestão'),
    ('home.stats.l4', 'Residency applications approved', 'Pedidos de residência aprovados'),
    ('home.who.label', 'Who we are', 'Quem somos'),
    ('home.who.title', 'Owning property, without the work of owning property.', 'Ter um imóvel, sem o trabalho de ter um imóvel.'),
    ('home.who.body', 'One group for the whole of a tangible asset: the advice, the purchase, the running and the reporting. Holding an apartment in Lisbon can be as hands-off as holding shares, and the asset stays in your name.',
     'Um só grupo para todo o ciclo de um ativo tangível: o aconselhamento, a compra, a gestão e os relatórios. Ter um apartamento em Lisboa pode ser tão tranquilo como ter ações, e o ativo continua em seu nome.'),
    ('home.svc.advisory.title', 'Investment Advisory', 'Consultoria de Investimento'),
    ('home.svc.advisory.body', 'Independent advice on where and what to buy, including Golden Visa, D2 residency and the route to EU citizenship.',
     'Aconselhamento independente sobre onde e o que comprar, incluindo Golden Visa, residência D2 e o caminho para a cidadania europeia.'),
    ('home.svc.realestate.title', 'Real Estate', 'Imobiliário'),
    ('home.svc.realestate.body', "Access to every property on the market, not one developer's stock, with relocation and lifestyle support for you and your family.",
     'Acesso a todos os imóveis do mercado, e não apenas ao stock de um promotor, com apoio à mudança e ao estilo de vida para si e para a sua família.'),
    ('home.svc.pm.title', 'Property Management', 'Gestão de Propriedades'),
    ('home.svc.pm.body', 'Short and long-term rentals, asset and condominium management, utilities and upkeep, run to get the most from the asset.',
     'Arrendamento de curta e longa duração, gestão do ativo e do condomínio, utilidades e manutenção, para tirar o máximo partido do ativo.'),
    ('home.svc.hosp.title', 'Hospitality &amp; F&amp;B', 'Hotelaria e Restauração'),
    ('home.svc.hosp.body', 'Branded residences and the brands behind them. We own and operate Hygge, from serviced apartments to restaurants.',
     'Residências de marca e as marcas por trás delas. Somos donos e operadores da Hygge, de apartamentos com serviços a restaurantes.'),
    ('home.svc.more', 'Learn more', 'Saber mais'),
    ('home.help.label', 'How we can help', 'Como podemos ajudar'),
    ('home.help.title', 'Three steps, one team.', 'Três passos, uma só equipa.'),
    ('home.help.k1', 'Step one', 'Passo um'),
    ('home.help.k2', 'Step two', 'Passo dois'),
    ('home.help.k3', 'Step three', 'Passo três'),
    ('home.help.t1', 'Understand your needs', 'Perceber as suas necessidades'),
    ('home.help.t2', 'Find the solution', 'Encontrar a solução'),
    ('home.help.t3', 'Execution', 'Execução'),
    ('home.help.d1', 'An initial consultation about what you want the asset to do: income, growth, residency, a home, or all of them.',
     'Uma primeira conversa sobre o que quer que o ativo faça: rendimento, valorização, residência, uma casa, ou tudo isto.'),
    ('home.help.d2', 'Independent advice on the options that fit, with no upfront cost and no obligation to proceed.',
     'Aconselhamento independente sobre as opções certas, sem custos iniciais e sem compromisso.'),
    ('home.help.d3', 'We carry it through, then run the asset for profit, efficiency and use, and report on it.',
     'Levamos tudo até ao fim e depois gerimos o ativo a pensar na rentabilidade, na eficiência e na utilização, com relatórios regulares.'),
    ('home.journey.label', 'A typical client journey', 'O percurso típico de um cliente'),
    ('home.journey.title', 'From the first call to the resale, in one place.', 'Do primeiro contacto à revenda, num só lugar.'),
    ('home.journey.t1', 'Investment advisory', 'Consultoria de investimento'),
    ('home.journey.d1', 'Strategy, budget and location, including Golden Visa or D2 where residency is part of the plan.',
     'Estratégia, orçamento e localização, incluindo Golden Visa ou D2 quando a residência faz parte do plano.'),
    ('home.journey.t2', 'Due diligence', 'Due diligence'),
    ('home.journey.d2', 'Our investment team and lawyers check the asset, the title and the numbers before you commit.',
     'A nossa equipa de investimento e os advogados verificam o ativo, o registo e os números antes de avançar.'),
    ('home.journey.t3', 'Project management', 'Gestão de projeto'),
    ('home.journey.d3', 'For properties under construction, we follow the works and the developer on your behalf.',
     'Nos imóveis em construção, acompanhamos a obra e o promotor por si.'),
    ('home.journey.t4', 'Handover and snagging', 'Entrega e vistoria'),
    ('home.journey.d4', 'Defects listed and closed before the keys change hands.',
     'Defeitos identificados e resolvidos antes da entrega das chaves.'),
    ('home.journey.t5', 'Asset management', 'Gestão do ativo'),
    ('home.journey.d5', 'Furnishing, licensing, condominium, utilities and maintenance.',
     'Mobiliário, licenciamento, condomínio, utilidades e manutenção.'),
    ('home.journey.t6', 'Rental management', 'Gestão do arrendamento'),
    ('home.journey.d6', 'Short or long-term letting, priced and run for occupancy and yield.',
     'Arrendamento de curta ou longa duração, com preço e gestão pensados para a ocupação e a rentabilidade.'),
    ('home.journey.t7', 'Reporting', 'Relatórios'),
    ('home.journey.d7', 'Income, costs and occupancy, in the same format every quarter.',
     'Receitas, custos e ocupação, no mesmo formato todos os trimestres.'),
    ('home.journey.t8', 'Exit and resale', 'Saída e revenda'),
    ('home.journey.d8', 'When the time comes, we value, market and sell the asset for you.',
     'Quando chegar a altura, avaliamos, promovemos e vendemos o ativo por si.'),
    ('home.cases.label', 'Case studies', 'Casos de estudo'),
    ('home.cases.title', 'Assets we own, run and report on.', 'Ativos que detemos, gerimos e acompanhamos.'),
    ('home.cases.juliao.place', 'Baixa, Lisbon', 'Baixa, Lisboa'),
    ('home.cases.juliao.body', 'Twelve apartments and a restaurant that we specified, delivered and still run.',
     'Doze apartamentos e um restaurante que especificámos, entregámos e continuamos a gerir.'),
    ('home.cases.anjos.place', 'Anjos, Lisbon', 'Anjos, Lisboa'),
    ('home.cases.anjos.body', 'Eight apartments held and let since 2021, with a cost line kept short.',
     'Oito apartamentos detidos e arrendados desde 2021, com custos controlados.'),
    ('home.cases.picoas.place', 'Picoas, Lisbon', 'Picoas, Lisboa'),
    ('home.cases.picoas.body', 'Serviced apartments and food and beverage under one brand and one operator.',
     'Apartamentos com serviços e restauração, com uma só marca e um só operador.'),
    ('home.cases.kaffe.place', 'Lisbon', 'Lisboa'),
    ('home.cases.kaffe.body', 'Our own restaurant brand, built and run in-house across three locations.',
     'A nossa marca de restauração, criada e gerida internamente em três espaços.'),
    ('home.cases.units', 'Units', 'Unidades'),
    ('home.cases.occupancy', 'Occupancy', 'Ocupação'),
    ('home.cases.since', 'Since', 'Desde'),
    ('home.cases.model', 'Model', 'Modelo'),
    ('home.cases.locations', 'Locations', 'Espaços'),
    ('home.cases.margin', 'Margin', 'Margem'),
    ('home.cases.read', 'Read the case study', 'Ler o caso de estudo'),
    ('home.testimonials.title', 'Real stories, real success.', 'Histórias reais, resultados reais.'),
    ('home.testimonials.sub', 'International investors we have advised across Portugal, in their words.',
     'Investidores internacionais que aconselhámos em Portugal, nas suas próprias palavras.'),
    ('home.news.title', 'Insight, not marketing.', 'Análise, não publicidade.'),
    ('home.news.all', 'All articles', 'Todos os artigos'),
    ('home.close.title', 'Objective advice starts with a conversation.', 'Um aconselhamento objetivo começa com uma conversa.'),
    ('home.close.body', 'No obligation, no pressure to buy anything specific. Just a clear view of what is possible, and whether residency belongs in the plan.',
     'Sem compromisso e sem pressão para comprar nada em particular. Apenas uma visão clara do que é possível, e se a residência faz sentido no plano.'),
]


def tag(html, key, en):
    """Tag every element whose whole text is `en` (or wrap `en` in a span when it
    shares the element with an icon). Returns (html, count)."""
    n = 0
    # element whose content is exactly the string
    pat = re.compile(r'<([a-z0-9]+)((?:\s[^<>]*?)?)>' + re.escape(en) + r'</\1>')
    def own(m):
        nonlocal n
        if 'data-cms=' in m.group(2):
            return m.group(0)
        n += 1
        if m.group(1) == 'a':  # data-cms on <a> rewrites href, so tag the words
            return f'<a{m.group(2)}><span data-cms="{key}">{en}</span></a>'
        return f'<{m.group(1)}{m.group(2)} data-cms="{key}">{en}</{m.group(1)}>'
    html = pat.sub(own, html)
    # text followed by an inline svg inside a link/span: wrap the words
    pat2 = re.compile(r'>(\s*)' + re.escape(en) + r'(\s*)<svg')
    def wrap(m):
        nonlocal n
        n += 1
        return f'>{m.group(1)}<span data-cms="{key}">{en}</span>{m.group(2)}<svg'
    html = pat2.sub(wrap, html)
    return html, n


def home_css():
    css = (ROOT / 'home-v2.css').read_text()
    a = css.index('/* ═════════════ VARIANT A')
    c = css.index('/* ═════════════ VARIANT C')
    sw = css.index('/* ---------- preview-only variant switcher')
    shared, varc = css[:a], css[c:sw]
    varc = varc.replace('html[data-variant="c"] ', '')
    header = shared.split('\n', 3)
    shared = shared.replace(shared[:shared.index('*/') + 2],
        '/* Homepage (promoted from /home-v2, variant C, 2026-10-26). The other\n'
        '   variants stay in home-v2.css for the /home-v2 preview. */')
    return shared + varc


def main():
    old = (ROOT / 'index.html').read_text()
    v2 = (ROOT / 'home-v2.html').read_text()

    # 1) keep the outgoing homepage
    v1 = re.sub(r'<title>.*?</title>', '<title>Smith &amp; Adams | Homepage (previous)</title>', old, count=1)
    v1 = re.sub(r'<link rel="canonical"[^\n]*', '<meta name="robots" content="noindex, nofollow" />', v1, count=1)
    v1 = re.sub(r'\s*<meta property="og:url"[^>]*>', '', v1, count=1)
    (ROOT / 'home-v1.html').write_text(v1)

    # 2) new homepage
    lines = old.split('\n')
    hero = next(i for i, l in enumerate(lines) if 'class="rd-hero"' in l) - 1
    testi = next(i for i, l in enumerate(lines) if 'TESTIMONIALS' in l)
    head, tail = '\n'.join(lines[:hero]), '\n'.join(lines[testi:])
    s0 = v2.index('<!-- ══════════════════ HERO')
    s1 = v2.index('<!-- ══════════════════ TESTIMONIALS')
    body = '        ' + v2[s0:s1].lstrip()
    head = head.replace('<link rel="stylesheet" href="/redesign.css?v=g29" />',
                        '<link rel="stylesheet" href="/redesign.css?v=g29" />\n<link rel="stylesheet" href="/home.css?v=1" />', 1)
    tail = tail.replace('<script src="/redesign.js?v=g29"></script>',
                        '<script src="/redesign.js?v=g29"></script>\n    <script src="/home.js?v=1" defer></script>', 1)
    # Only the page body is tagged: the nav and footer have their own keys.
    f = tail.index('<footer')
    region, footer = body + tail[:f], tail[f:]
    missing = []
    for key, en, _ in COPY:
        region, n = tag(region, key, en)
        if n == 0:
            missing.append(key)
    if missing:
        sys.exit('not found in HTML: ' + ', '.join(missing))
    html = head + '\n' + region + footer
    (ROOT / 'index.html').write_text(html)
    (ROOT / 'home.css').write_text(home_css())

    # 3) home.js = home-v2.js without the switcher
    js = (ROOT / 'home-v2.js').read_text()
    js = js[js.index('  // ---- case-study carousel'):]
    js = ('// Homepage: case-study carousel (pages by one card, works without motion).\n'
          '(function () {\n' + js)
    js = js.replace("    syncCases();\n  });\n  mark();\n", '')
    (ROOT / 'home.js').write_text(js)

    rows = [{'key': k, 'locale': 'en', 'value': en} for k, en, _ in COPY] + \
           [{'key': k, 'locale': 'pt', 'value': pt} for k, _, pt in COPY]
    (ROOT / '.home-cms-rows.json').write_text(json.dumps(rows, ensure_ascii=False))
    print(f'ok: {len(COPY)} keys, {len(rows)} rows -> .home-cms-rows.json')


if __name__ == '__main__':
    main()
