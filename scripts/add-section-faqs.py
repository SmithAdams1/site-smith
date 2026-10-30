#!/usr/bin/env python3
"""Insert (or refresh) the section FAQs on the homepage, Real Estate,
Property Management and Hospitality, and write their copy to the CMS.

Each page gets its own questions (HoS: "different ones on each page", generic
on the homepage). Answers use only facts from knowledge/ (Golden Visa route
closed Oct 2023, 2026 IMT incl. the non-resident 7.5%, AMI 27772, D2 stay).
Copy lives here; the CMS rows (faq.<page>.<n>.q / .a, EN + PT) let the team
edit it later. Re-running replaces the block between the FAQ markers.

    python3 scripts/add-section-faqs.py
"""
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FAQS = {
    'home': {
        'file': 'index.html', 'before': '        <!-- ══════════════════ CLOSING ══════════════════ -->',
        'title': ('Questions, answered.', 'Perguntas e respostas.'),
        'items': [
            (('What does Smith &amp; Adams do?', 'O que faz a Smith &amp; Adams?'),
             ('We are an independent real estate group for foreign investors in Portugal. One team covers investment advisory and residency, the search for the right property, property management, and hospitality through our own Hygge brands.',
              'Somos um grupo imobiliário independente para investidores estrangeiros em Portugal. Uma só equipa trata da consultoria de investimento e de residência, da procura do imóvel certo, da gestão do imóvel e da hotelaria, através das nossas marcas Hygge.')),
            (('Can foreigners buy property in Portugal?', 'Os estrangeiros podem comprar casa em Portugal?'),
             ('Yes. There are no restrictions on foreign ownership of residential property. You need a Portuguese tax number (NIF), and non-residents usually appoint a fiscal representative; we arrange both.',
              'Sim. Não há restrições à compra de habitação por estrangeiros. Precisa de um número de identificação fiscal (NIF) e os não residentes costumam nomear um representante fiscal; tratamos de ambos.')),
            (('Does buying property still give a Golden Visa?', 'Comprar casa ainda dá acesso ao Golden Visa?'),
             ('No. The direct real-estate route to the Golden Visa closed in October 2023. The Golden Visa remains available through other investments, such as regulated funds, and property can support residency under the D2 visa. <a href="/golden-visa">Golden Visa guide</a> &middot; <a href="/d2-visa">D2 guide</a>.',
              'Não. A via direta do imobiliário para o Golden Visa terminou em outubro de 2023. O Golden Visa continua disponível através de outros investimentos, como fundos regulados, e o imobiliário pode apoiar uma residência ao abrigo do visto D2. <a href="/golden-visa">Guia Golden Visa</a> &middot; <a href="/d2-visa">Guia D2</a>.')),
            (('Is there a cost to speak with you?', 'Falar convosco tem custos?'),
             ('No. The first consultation is free and without obligation. If you decide to go ahead, the scope and any fees are agreed with you before work starts.',
              'Não. A primeira consulta é gratuita e sem compromisso. Se decidir avançar, o âmbito e eventuais honorários são acordados consigo antes de começarmos.')),
            (('Do I have to live in Portugal?', 'Tenho de viver em Portugal?'),
             ('It depends on the route. The Golden Visa has a light stay requirement. The D2 visa requires genuine residence, with exceptions for justified absences such as business travel. We confirm what applies to your case.',
              'Depende da via. O Golden Visa tem um requisito de permanência reduzido. O visto D2 exige residência efetiva, com exceções para ausências justificadas, por exemplo por motivos profissionais. Confirmamos o que se aplica ao seu caso.')),
            (('Where in Portugal do you work?', 'Em que zonas de Portugal trabalham?'),
             ('Across the country, with most activity in <a href="/real-estate/lisbon">Lisbon</a>, <a href="/real-estate/cascais">Cascais</a>, <a href="/real-estate/porto">Porto</a> and the <a href="/real-estate/algarve">Algarve</a>. Our own buildings are in Lisbon.',
              'Em todo o país, com mais atividade em <a href="/real-estate/lisbon">Lisboa</a>, <a href="/real-estate/cascais">Cascais</a>, no <a href="/real-estate/porto">Porto</a> e no <a href="/real-estate/algarve">Algarve</a>. Os nossos edifícios ficam em Lisboa.')),
        ],
    },
    'realestate': {
        'file': 'real-estate.shell.html', 'before': '<!-- ════════ CTA · talk to the team (form) ════════ -->',
        'title': ('Buying property in Portugal, answered.', 'Comprar casa em Portugal: perguntas e respostas.'),
        'items': [
            (('Do you only sell your own properties?', 'Só vendem imóveis vossos?'),
             ('No. We are independent advisers acting on behalf of the buyer. Through partnerships with large and small agencies we can show you most of the market, not one developer\'s stock. Real estate mediation is carried out by Benefit Discovery, Lda, AMI 27772.',
              'Não. Somos consultores independentes do lado do comprador. Com parcerias com agências grandes e pequenas mostramos-lhe a maior parte do mercado, e não o stock de um só promotor. A mediação imobiliária é feita pela Benefit Discovery, Lda, AMI 27772.')),
            (('What taxes do I pay when I buy?', 'Que impostos pago na compra?'),
             ('Property transfer tax (IMT) and 0.8% stamp duty. Since May 2026 non-resident buyers of housing pay a single 7.5% IMT rate, unless they were tax resident in Portugal before or become resident within two years. Every property page has a calculator.',
              'IMT e Imposto do Selo de 0,8%. Desde maio de 2026 os compradores não residentes de habitação pagam uma taxa única de IMT de 7,5%, salvo se já tiverem sido residentes fiscais em Portugal ou passarem a sê-lo nos dois anos seguintes. Cada página de imóvel tem um simulador.')),
            (('Can I buy without travelling to Portugal?', 'Posso comprar sem ir a Portugal?'),
             ('Yes. A lawyer can sign on your behalf with a power of attorney, and visits can be done by video. Many of our clients only travel once the property is theirs.',
              'Sim. Um advogado pode assinar por si com uma procuração e as visitas podem ser feitas por vídeo. Muitos dos nossos clientes só viajam quando o imóvel já é seu.')),
            (('How long does a purchase take?', 'Quanto tempo demora uma compra?'),
             ('Usually a few weeks to a few months between the promissory contract (CPCV) and the deed, depending on financing, the seller and the property\'s paperwork. Our due diligence runs before you sign anything.',
              'Normalmente entre algumas semanas e alguns meses entre o contrato-promessa (CPCV) e a escritura, consoante o financiamento, o vendedor e a documentação do imóvel. A nossa due diligence é feita antes de assinar seja o que for.')),
            (('Can non-residents get a mortgage?', 'Os não residentes podem ter crédito habitação?'),
             ('Yes, Portuguese banks lend to non-residents, usually with a larger deposit than for residents. Each property page has a mortgage calculator in euros, dollars or pounds.',
              'Sim, os bancos portugueses concedem crédito a não residentes, normalmente com uma entrada maior do que para residentes. Cada página de imóvel tem um simulador de crédito em euros, dólares ou libras.')),
            (('Can a property help me get residency?', 'Um imóvel pode ajudar a obter residência?'),
             ('Not through the Golden Visa, whose real-estate route closed in October 2023. Property can support a residence application under the D2 visa. <a href="/d2-visa">Read the D2 guide</a>.',
              'Não através do Golden Visa, cuja via imobiliária terminou em outubro de 2023. O imóvel pode apoiar um pedido de residência ao abrigo do visto D2. <a href="/d2-visa">Leia o guia D2</a>.')),
        ],
    },
    'pm': {
        'file': 'property-management.html', 'before': '<!-- PRE-PORTFOLIO CTA -->',
        'title': ('Property management, answered.', 'Gestão de propriedades: perguntas e respostas.'),
        'items': [
            (('Which properties do you manage?', 'Que imóveis gerem?'),
             ('Apartments and houses for short or long-term rental, mainly in Lisbon and the surrounding area, for owners we have advised and for independent owners.',
              'Apartamentos e moradias para arrendamento de curta ou longa duração, sobretudo em Lisboa e arredores, de proprietários que aconselhámos e de proprietários independentes.')),
            (('Do I need a licence for short-term rentals?', 'Preciso de licença para arrendamento de curta duração?'),
             ('Yes. Short-term rentals need a local accommodation (Alojamento Local) registration, and some municipalities limit new registrations in certain areas. We check what applies to your property before it is listed.',
              'Sim. O arrendamento de curta duração exige registo de Alojamento Local, e alguns municípios limitam novos registos em certas zonas. Verificamos o que se aplica ao seu imóvel antes de o anunciar.')),
            (('How will I know how the property is doing?', 'Como sei como está a correr?'),
             ('You receive a clear monthly statement of income and expenses and a net-of-cost review of performance every quarter.',
              'Recebe um extrato mensal claro de receitas e despesas e uma análise trimestral do desempenho líquido de custos.')),
            (('Can you manage it if I live abroad?', 'Podem gerir se eu viver fora?'),
             ('Yes, that is most of our owners. We deal with utilities, repairs, the condominium and the authorities on your behalf, and can act as your tax representative in Portugal.',
              'Sim, é o caso da maioria dos nossos proprietários. Tratamos dos serviços, das reparações, do condomínio e das entidades oficiais por si, e podemos ser o seu representante fiscal em Portugal.')),
            (('How do you set prices?', 'Como definem os preços?'),
             ('By season and demand, across Airbnb, Booking.com and our own booking channel, balancing occupancy and nightly rate to maximise net income.',
              'Por época e procura, no Airbnb, no Booking.com e no nosso canal de reservas próprio, equilibrando ocupação e preço por noite para maximizar o rendimento líquido.')),
            (('What does it cost?', 'Quanto custa?'),
             ('It depends on the property and the services you need. After a first assessment we send you a written proposal, with no obligation.',
              'Depende do imóvel e dos serviços de que precisa. Depois de uma primeira avaliação enviamos-lhe uma proposta escrita, sem compromisso.')),
        ],
    },
    'hosp': {
        'file': 'hospitality.html', 'before': '<footer class="w-full py-12 md:py-16" style="background:#0C1E28;">',
        'title': ('Hospitality, answered.', 'Hotelaria: perguntas e respostas.'),
        'items': [
            (('What is Hygge?', 'O que é a Hygge?'),
             ('Hygge is the group\'s own hospitality brand: Hygge Residences for stays and Hygge Kaffe for restaurants. We develop, brand and operate them ourselves rather than licensing the name.',
              'A Hygge é a marca de hotelaria do próprio grupo: Hygge Residences para estadias e Hygge Kaffe para restaurantes. Desenvolvemos, criamos e operamos as marcas nós próprios, em vez de licenciar o nome.')),
            (('Can I stay at a Hygge residence?', 'Posso ficar numa residência Hygge?'),
             ('Yes. Choose your dates in the booking search on this page, or find us on Airbnb and Booking.com.',
              'Sim. Escolha as datas na pesquisa de reservas desta página, ou encontre-nos no Airbnb e no Booking.com.')),
            (('Can I invest in a hospitality project?', 'Posso investir num projeto de hotelaria?'),
             ('Opportunities change over time. Speak with an expert about what is available now and whether it fits your objectives.',
              'As oportunidades mudam ao longo do tempo. Fale com um especialista sobre o que está disponível agora e se encaixa nos seus objetivos.')),
            (('Do you run hospitality for other owners?', 'Gerem hotelaria para outros proprietários?'),
             ('Our property management team runs short-term rentals for owners in and around Lisbon, with the same standard as our own buildings. <a href="/property-management">See property management</a>.',
              'A nossa equipa de gestão de propriedades gere arrendamento de curta duração para proprietários em Lisboa e arredores, com o mesmo padrão dos nossos edifícios. <a href="/property-management">Ver gestão de propriedades</a>.')),
        ],
    },
}

# Older browsers ignore <details name>; this keeps one answer open at a time there too.
CLOSE = "if(this.open){var s=this.parentNode.querySelectorAll('details[open]');for(var i=0;i<s.length;i++){if(s[i]!==this)s[i].open=false;}}"
START, END = '<!-- SECTION-FAQ:START -->', '<!-- SECTION-FAQ:END -->'


def block(page, conf):
    plain = lambda s: re.sub(r'<[^>]+>', '', html.unescape(s))
    items = ''.join(
        f'<details name="faq-{page}" ontoggle="{CLOSE}"><summary><span data-cms="faq.{page}.{i}.q" data-cms-attr="html">{q[0]}</span></summary>'
        f'<div class="sa-faq__a" data-cms="faq.{page}.{i}.a" data-cms-attr="html">{a[0]}</div></details>'
        for i, (q, a) in enumerate(conf['items']))
    ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': plain(q[0]), 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a[0])}}
        for q, a in conf['items']]}
    return (f'{START}\n<section class="sa-faq" id="faq">\n  <div class="sa-faq__in">\n'
            f'    <p class="sa-faq__k" data-cms="faq.{page}.label">FAQ</p>\n'
            f'    <h2 class="sa-faq__h" data-cms="faq.{page}.title" data-cms-attr="html">{conf["title"][0]}</h2>\n'
            f'    <div class="sa-faq__list">{items}</div>\n  </div>\n'
            f'  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n</section>\n{END}\n')


def main():
    rows = []
    for page, conf in FAQS.items():
        p = ROOT / conf['file']
        s = p.read_text()
        b = block(page, conf)
        if START in s:
            s = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n', lambda m: b, s, flags=re.S)
        else:
            assert s.count(conf['before']) == 1, (page, s.count(conf['before']))
            s = s.replace(conf['before'], b + conf['before'])
        p.write_text(s)
        rows += [{'key': f'faq.{page}.label', 'locale': 'en', 'value': 'FAQ'}, {'key': f'faq.{page}.label', 'locale': 'pt', 'value': 'Perguntas frequentes'},
                 {'key': f'faq.{page}.title', 'locale': 'en', 'value': conf['title'][0]}, {'key': f'faq.{page}.title', 'locale': 'pt', 'value': conf['title'][1]}]
        for i, (q, a) in enumerate(conf['items']):
            rows += [{'key': f'faq.{page}.{i}.q', 'locale': 'en', 'value': q[0]}, {'key': f'faq.{page}.{i}.q', 'locale': 'pt', 'value': q[1]},
                     {'key': f'faq.{page}.{i}.a', 'locale': 'en', 'value': a[0]}, {'key': f'faq.{page}.{i}.a', 'locale': 'pt', 'value': a[1]}]
        print(page, len(conf['items']), 'questions ->', conf['file'])
    sys.path.insert(0, '/tmp')
    from sbkey import service_key
    k = service_key()
    req = urllib.request.Request('https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/site_content?on_conflict=key,locale',
                                 data=json.dumps(rows).encode(), method='POST',
                                 headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json',
                                          'Prefer': 'resolution=merge-duplicates,return=minimal'})
    print('cms', urllib.request.urlopen(req).status, len(rows), 'rows')


if __name__ == '__main__':
    main()
