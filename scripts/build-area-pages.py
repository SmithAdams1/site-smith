#!/usr/bin/env python3
"""Build the area landing pages: real-estate/<slug>.html (EN) and
pt/real-estate/<slug>.html (PT), served as /real-estate/<slug> and
/pt/real-estate/<slug>.

Copy lives in AREAS below; market figures in STATS come from INE (dated,
sourced, see each entry). Listing counts, price range and the hero photo are
read from the live properties table at build time, so re-run after big feed
changes:

    python3 scripts/build-area-pages.py

The area queries must match AREAS in real-estate.shell.html.
"""
import html
import json
import re
import statistics
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://www.smithandadams.com'
SB = 'https://bcjtkfipcfvvitglgpys.supabase.co/rest/v1/'
ANON = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6'
        'ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA')

# INE medians. price = median value per m2 of dwellings sold; rent = median
# rent per m2 of new lease agreements. Fill only with sourced figures.
PER = {'en': '12 months to June 2026', 'pt': '12 meses até junho de 2026'}
STATS = {
    'lisbon': [{'geo': {'en': 'Lisbon (municipality)', 'pt': 'Lisboa (concelho)'}, 'price': 5192, 'rent': 17.43, 'yoy': 14.7}],
    'cascais': [{'geo': {'en': 'Cascais (municipality)', 'pt': 'Cascais (concelho)'}, 'price': 4889, 'rent': 16.83}],
    'porto': [{'geo': {'en': 'Porto (municipality)', 'pt': 'Porto (concelho)'}, 'price': 3631, 'rent': 14.48, 'yoy': 18.7}],
    'algarve': [{'geo': {'en': 'the Algarve region', 'pt': 'região do Algarve'}, 'price': 3338, 'rent': 10.96}],
    'silver-coast': [{'geo': {'en': 'the Oeste region', 'pt': 'região Oeste'}, 'price': 2130, 'rent': 8.07}],
    'comporta': [{'geo': {'en': 'Grândola (municipality)', 'pt': 'Grândola (concelho)'}, 'price': 2543, 'rent': 11.13},
                 {'geo': {'en': 'Alcácer do Sal (municipality)', 'pt': 'Alcácer do Sal (concelho)'}, 'price': 1956, 'rent': 7.81}],
    'coimbra': [{'geo': {'en': 'Coimbra (municipality)', 'pt': 'Coimbra (concelho)'}, 'price': 2295, 'rent': 9.44}],
}
STATS_NOTE = {
    'comporta': {'en': 'Comporta is not an INE statistical area. These are the medians for the two municipalities it spans, which include inland areas, so they understate prices on the coast.',
                 'pt': 'A Comporta não é uma unidade estatística do INE. Estas são as medianas dos dois concelhos que abrange, que incluem zonas do interior e por isso ficam abaixo dos preços da costa.'},
}
STATS_SOURCE = {
    'en': 'Source: INE, <a href="https://www.ine.pt/xportal/xmain?xpid=INE&amp;xpgid=ine_destaques&amp;DESTAQUESdest_boui=770298664&amp;DESTAQUESmodo=2&amp;xlang=pt" target="_blank" rel="noopener">Housing prices at local level, Q2 2026</a> (published 23 October 2026) and <a href="https://www.ine.pt/xportal/xmain?xpid=INE&amp;xpgid=ine_destaques&amp;DESTAQUESdest_boui=770299146&amp;DESTAQUESmodo=2&amp;xlang=pt" target="_blank" rel="noopener">Housing rents at local level, Q2 2026</a> (published 29 September 2026). Medians for the 12 months to June 2026; rents are for new lease agreements. Portugal: €2,264/m² and €9.76/m².',
    'pt': 'Fonte: INE, <a href="https://www.ine.pt/xportal/xmain?xpid=INE&amp;xpgid=ine_destaques&amp;DESTAQUESdest_boui=770298664&amp;DESTAQUESmodo=2&amp;xlang=pt" target="_blank" rel="noopener">Estatísticas de Preços da Habitação ao nível local, 2.º trimestre de 2026</a> (publicado a 23 de outubro de 2026) e <a href="https://www.ine.pt/xportal/xmain?xpid=INE&amp;xpgid=ine_destaques&amp;DESTAQUESdest_boui=770299146&amp;DESTAQUESmodo=2&amp;xlang=pt" target="_blank" rel="noopener">Estatísticas de Rendas da Habitação ao nível local, 2.º trimestre de 2026</a> (publicado a 29 de setembro de 2026). Medianas dos 12 meses até junho de 2026; rendas dos novos contratos de arrendamento. Portugal: 2.264 €/m² e 9,76 €/m².',
}

AREAS = [
    {
        'slug': 'lisbon', 'in_pt': 'em Lisboa', 'q': 'region=in.("Lisboa","Lisbon")&city=neq.Cascais',
        'name': {'en': 'Lisbon', 'pt': 'Lisboa'},
        'lede': {
            'en': 'Lisbon is Portugal\'s capital and largest economic centre, and the market most international buyers start with. Smith &amp; Adams is based here: our team and our own buildings are in the city.',
            'pt': 'Lisboa é a capital e o maior centro económico de Portugal, e o mercado por onde começa a maioria dos compradores internacionais. A Smith &amp; Adams está sediada aqui: a nossa equipa e os nossos edifícios estão na cidade.'},
        'why': {
            'en': [('The capital and the largest economy', 'Government, finance, technology and most international companies are concentrated in the Lisbon region, which keeps demand for housing broad: residents, professionals, students and visitors.'),
                   ('Connected to the world', 'Humberto Delgado Airport has direct flights to North America, Brazil, Africa and most European capitals, which matters for owners who live abroad and for short-stay demand.'),
                   ('Many markets in one city', 'From historic Baixa, Alfama and Graça to the river front, Avenidas Novas and the regenerating east side around Beato and Marvila, each district has its own price level and tenant profile.'),
                   ('Where we operate every day', 'We run our own buildings in Lisbon, including Hygge Residences S. Julião and Anjos 40, so our view of rents, occupancy and running costs comes from managing assets, not from listings.')],
            'pt': [('A capital e a maior economia', 'O Estado, a banca, a tecnologia e a maioria das empresas internacionais concentram-se na região de Lisboa, o que mantém a procura de habitação diversificada: residentes, profissionais, estudantes e visitantes.'),
                   ('Ligada ao mundo', 'O Aeroporto Humberto Delgado tem voos diretos para a América do Norte, o Brasil, África e a maioria das capitais europeias, o que conta para quem vive fora e para a procura de curta duração.'),
                   ('Vários mercados numa só cidade', 'Da Baixa, Alfama e Graça à frente ribeirinha, às Avenidas Novas e à zona oriental em transformação, em torno do Beato e de Marvila, cada bairro tem o seu nível de preço e o seu perfil de inquilino.'),
                   ('Onde trabalhamos todos os dias', 'Gerimos edifícios próprios em Lisboa, como o Hygge Residences S. Julião e o Anjos 40, por isso a nossa leitura de rendas, ocupação e custos vem de gerir ativos, não de anúncios.')]},
    },
    {
        'slug': 'cascais', 'in_pt': 'em Cascais', 'q': 'city=eq.Cascais',
        'name': {'en': 'Cascais', 'pt': 'Cascais'},
        'lede': {
            'en': 'Cascais is a coastal municipality west of Lisbon, connected to the city centre by the Cascais train line and the A5 motorway. It combines beaches, a marina and an established international community with easy access to Lisbon.',
            'pt': 'Cascais é um concelho costeiro a oeste de Lisboa, ligado ao centro da cidade pela linha de comboio de Cascais e pela autoestrada A5. Junta praias, marina e uma comunidade internacional consolidada a um acesso fácil a Lisboa.'},
        'why': {
            'en': [('Coast and capital together', 'Owners get a seaside lifestyle while staying within commuting distance of Lisbon by train or car.'),
                   ('An international community', 'Cascais has long attracted foreign residents and families, supported by several international schools in the municipality and nearby.'),
                   ('A family-home market', 'Demand is led by people who live here, not only by visitors, which favours long-term rentals and owner-occupiers.'),
                   ('A premium price level', 'Cascais is one of the most expensive housing markets in Portugal, so entry costs are higher and gross yields tend to be lower than in Lisbon\'s more affordable districts.')],
            'pt': [('Costa e capital ao mesmo tempo', 'Os proprietários têm um estilo de vida à beira-mar sem deixar de estar a uma distância de Lisboa que se faz de comboio ou de carro.'),
                   ('Uma comunidade internacional', 'Cascais atrai há muito residentes e famílias estrangeiras, com várias escolas internacionais no concelho e nas proximidades.'),
                   ('Um mercado de casas de família', 'A procura vem sobretudo de quem cá vive e não só de quem visita, o que favorece o arrendamento de longa duração e a habitação própria.'),
                   ('Um nível de preço elevado', 'Cascais é um dos mercados de habitação mais caros do país, por isso o custo de entrada é mais alto e as rentabilidades brutas tendem a ser mais baixas do que nos bairros mais acessíveis de Lisboa.')]},
    },
    {
        'slug': 'porto', 'in_pt': 'no Porto', 'q': 'region=in.("Porto","Oporto")',
        'name': {'en': 'Porto', 'pt': 'Porto'},
        'lede': {
            'en': 'Porto is Portugal\'s second city and the centre of the north. Its historic centre is a UNESCO World Heritage Site, and prices per square metre sit below Lisbon\'s.',
            'pt': 'O Porto é a segunda cidade do país e o centro do Norte. O centro histórico é Património Mundial da UNESCO e o preço por metro quadrado está abaixo do de Lisboa.'},
        'why': {
            'en': [('Second city, lower entry price', 'Porto offers a large urban market at a lower price per square metre than Lisbon, which widens the choice for a given budget.'),
                   ('A university and services city', 'The University of Porto and the city\'s hospitals and services sector bring steady demand from students and professionals.'),
                   ('Heritage that draws visitors', 'The historic centre and the Douro riverfront are a UNESCO World Heritage Site and a major destination, supporting short-stay demand where licensing allows it.'),
                   ('A wider metropolitan market', 'Vila Nova de Gaia and Matosinhos, across the river and on the coast, add alternatives to the city itself.')],
            'pt': [('Segunda cidade, entrada mais acessível', 'O Porto oferece um grande mercado urbano a um preço por metro quadrado inferior ao de Lisboa, o que alarga a escolha para o mesmo orçamento.'),
                   ('Uma cidade universitária e de serviços', 'A Universidade do Porto e os hospitais e serviços da cidade trazem procura estável de estudantes e profissionais.'),
                   ('Património que atrai visitantes', 'O centro histórico e a frente ribeirinha do Douro são Património Mundial da UNESCO e um destino de primeira linha, o que sustenta a procura de curta duração onde o licenciamento o permite.'),
                   ('Uma área metropolitana mais ampla', 'Vila Nova de Gaia e Matosinhos, do outro lado do rio e na costa, juntam alternativas à própria cidade.')]},
    },
    {
        'slug': 'algarve', 'in_pt': 'no Algarve', 'in_en': 'in the Algarve', 'q': 'region=eq.Faro',
        'name': {'en': 'Algarve', 'pt': 'Algarve'},
        'lede': {
            'en': 'The Algarve is Portugal\'s southern coast, served by Faro Airport. It is one of Europe\'s best-known holiday regions, with towns such as Lagos, Loulé, Tavira and Albufeira and a large international resident community.',
            'pt': 'O Algarve é a costa sul de Portugal, servida pelo Aeroporto de Faro. É uma das regiões de férias mais conhecidas da Europa, com cidades como Lagos, Loulé, Tavira e Albufeira e uma grande comunidade de residentes estrangeiros.'},
        'why': {
            'en': [('A proven holiday market', 'Coast, climate and golf have made the Algarve a long-established destination for visitors and second-home owners from across Europe.'),
                   ('Easy to reach', 'Faro Airport has direct flights to many European cities, which supports both holiday lets and owners who come and go.'),
                   ('Choice of lifestyle', 'From the cliffs of the west around Lagos to Loulé\'s golden triangle and the quieter east around Tavira, prices and character vary widely.'),
                   ('Seasonality to plan for', 'Rental demand peaks in summer. Net returns depend on pricing, management and the winter months, which is why we model a full year before recommending a holiday-let asset.')],
            'pt': [('Um mercado de férias consolidado', 'A costa, o clima e o golfe fizeram do Algarve um destino de longa data para visitantes e proprietários de segunda habitação de toda a Europa.'),
                   ('Fácil de alcançar', 'O Aeroporto de Faro tem voos diretos para muitas cidades europeias, o que apoia o arrendamento de férias e os proprietários que vão e vêm.'),
                   ('Estilos de vida diferentes', 'Das arribas do barlavento, em torno de Lagos, ao triângulo dourado de Loulé e ao sotavento mais tranquilo, em torno de Tavira, os preços e o carácter variam muito.'),
                   ('Sazonalidade a planear', 'A procura de arrendamento atinge o pico no verão. O retorno líquido depende do preço, da gestão e dos meses de inverno, e é por isso que modelamos o ano inteiro antes de recomendar um ativo para arrendamento de férias.')]},
    },
    {
        'slug': 'silver-coast', 'in_pt': 'na Costa de Prata', 'in_en': 'on the Silver Coast', 'q': 'region=eq.Leiria',
        'name': {'en': 'Silver Coast', 'pt': 'Costa de Prata'},
        'lede': {
            'en': 'The Silver Coast is the Atlantic coastline north of Lisbon, around Óbidos, Caldas da Rainha, Peniche and Nazaré. It offers beaches and historic towns about an hour from Lisbon, at lower prices than the capital.',
            'pt': 'A Costa de Prata é a costa atlântica a norte de Lisboa, em torno de Óbidos, Caldas da Rainha, Peniche e Nazaré. Oferece praias e vilas históricas a cerca de uma hora de Lisboa, a preços abaixo dos da capital.'},
        'why': {
            'en': [('Within reach of Lisbon', 'The A8 motorway puts most of the Silver Coast about an hour from Lisbon, close enough for regular visits or a hybrid life between the two.'),
                   ('Lower entry prices', 'Prices per square metre are well below Lisbon and Cascais, so the same budget buys more space, often with a garden or sea view.'),
                   ('Atlantic lifestyle', 'Surf at Peniche and Nazaré, the Óbidos lagoon and walled town, and quieter beaches than the Lisbon coast.'),
                   ('A smaller, less liquid market', 'Fewer transactions than in the big cities mean resale can take longer, which suits buyers with a longer horizon.')],
            'pt': [('Perto de Lisboa', 'A autoestrada A8 coloca a maior parte da Costa de Prata a cerca de uma hora de Lisboa, o suficiente para visitas regulares ou uma vida dividida entre as duas.'),
                   ('Preços de entrada mais baixos', 'O preço por metro quadrado está bem abaixo de Lisboa e de Cascais, por isso o mesmo orçamento compra mais espaço, muitas vezes com jardim ou vista de mar.'),
                   ('Estilo de vida atlântico', 'O surf em Peniche e na Nazaré, a lagoa e a vila amuralhada de Óbidos, e praias mais tranquilas do que as da linha de Lisboa.'),
                   ('Um mercado mais pequeno e menos líquido', 'Há menos transações do que nas grandes cidades, por isso a revenda pode demorar mais, o que serve quem investe a prazo mais longo.')]},
    },
    {
        'slug': 'comporta', 'in_pt': 'na Comporta', 'q': 'city=in.("Grândola","Alcácer do Sal")',
        'name': {'en': 'Comporta', 'pt': 'Comporta'},
        'lede': {
            'en': 'Comporta and the neighbouring coast of Grândola and Alcácer do Sal sit on the Alentejo coast, south of the Sado estuary. Low-density building, dunes and rice fields have made it one of Portugal\'s most sought-after second-home locations.',
            'pt': 'A Comporta e a costa vizinha de Grândola e Alcácer do Sal ficam no litoral alentejano, a sul do estuário do Sado. A construção de baixa densidade, as dunas e os arrozais tornaram-na num dos destinos de segunda habitação mais procurados do país.'},
        'why': {
            'en': [('Scarcity by design', 'Strict, low-density planning keeps new supply limited, which is a large part of the area\'s appeal and its price level.'),
                   ('Nature on the doorstep', 'Long Atlantic beaches, the Sado estuary nature reserve and open landscape, a short drive south of Lisbon.'),
                   ('A high-end segment', 'Most stock is villas, plots and resort homes aimed at buyers looking for space and privacy.'),
                   ('Thinner market, longer horizon', 'With few transactions, pricing is less transparent and resale can take time. We recommend Comporta to buyers who plan to use the home, not only to rent it.')],
            'pt': [('Escassez por definição', 'Um planeamento rigoroso e de baixa densidade limita a nova oferta, e isso explica boa parte do interesse pela zona e do seu nível de preço.'),
                   ('A natureza à porta', 'Longas praias atlânticas, a reserva natural do estuário do Sado e paisagem aberta, a pouca distância de carro a sul de Lisboa.'),
                   ('Um segmento alto', 'A maior parte da oferta são moradias, terrenos e casas em empreendimentos turísticos, para quem procura espaço e privacidade.'),
                   ('Mercado mais estreito, horizonte mais longo', 'Com poucas transações, os preços são menos transparentes e a revenda pode demorar. Recomendamos a Comporta a quem pensa usar a casa, e não apenas arrendá-la.')]},
    },
    {
        'slug': 'coimbra', 'in_pt': 'em Coimbra', 'q': 'region=eq.Coimbra',
        'name': {'en': 'Coimbra', 'pt': 'Coimbra'},
        'lede': {
            'en': 'Coimbra is a university city in central Portugal, halfway between Lisbon and Porto on the main rail line. Its university, one of the oldest in Europe, is a UNESCO World Heritage Site and the anchor of the local rental market.',
            'pt': 'Coimbra é uma cidade universitária no centro de Portugal, a meio caminho entre Lisboa e o Porto na linha ferroviária principal. A universidade, uma das mais antigas da Europa, é Património Mundial da UNESCO e o pilar do mercado de arrendamento local.'},
        'why': {
            'en': [('Student and hospital demand', 'The University of Coimbra and the city\'s large hospital centre bring a steady flow of students, researchers and health professionals looking for rentals.'),
                   ('Central location', 'Coimbra sits on the Lisbon to Porto rail line, with both cities reachable by train.'),
                   ('Lower entry prices', 'Prices per square metre are below those of Lisbon and Porto.'),
                   ('A small market for us', 'We list few properties in Coimbra today. Tell us what you are looking for and we will search the market for you.')],
            'pt': [('Procura de estudantes e da saúde', 'A Universidade de Coimbra e o grande centro hospitalar da cidade trazem um fluxo estável de estudantes, investigadores e profissionais de saúde à procura de casa para arrendar.'),
                   ('Localização central', 'Coimbra está na linha ferroviária Lisboa-Porto, com as duas cidades acessíveis de comboio.'),
                   ('Preços de entrada mais baixos', 'O preço por metro quadrado está abaixo do de Lisboa e do Porto.'),
                   ('Um mercado pequeno para nós', 'Temos hoje poucos imóveis em Coimbra. Diga-nos o que procura e pesquisamos o mercado por si.')]},
    },
]

UI = {
    'en': {
        'title': 'Property for sale {in_n} | Smith &amp; Adams',
        'h1': 'Property for sale {in_n}',
        'label': 'Real estate · {n}',
        'facts': '{n} at a glance', 'why': 'Why invest {in_n}', 'listings': 'Properties {in_n}',
        'see_all': 'See all {c} properties {in_n}', 'see_all_short': 'See all properties',
        'price_m2': 'Median price per m² of homes sold', 'rent_m2': 'Median monthly rent per m² of new leases',
        'yield': 'Indicative gross rental yield', 'yield_note': 'rent × 12 ÷ price, INE medians, not a return forecast',
        'our': 'Properties we list here', 'range': 'Asking prices in our listings',
        'faq': 'Questions about buying {in_n}', 'cta_h': 'Thinking about {n}?',
        'cta_p': 'Tell us your budget and what the property needs to do. We will come back with options from across the market, not one agency\'s stock.',
        'cta': 'Speak with an expert', 'home': 'Home', 're': 'Real Estate',
        'updated': 'Listing figures updated {d}.',
        'disclaimer': 'Information as of 2026, general in nature and not legal or tax advice. Rules change; confirm your situation with a qualified adviser.',
        'q_cost': 'How much does property cost {in_n}?',
        'a_cost_ine': 'According to INE, the median value of homes sold in {geo} was {p} per square metre in {per}.',
        'a_cost_ours': 'Asking prices in the {c} properties we list {in_n} run from {lo} to {hi}, with a median of {md} (as of {d}).',
        'q_tax': 'What taxes do I pay when buying property {in_n}?',
        'a_tax': 'Buyers pay property transfer tax (IMT) and stamp duty of 0.8% on the purchase price. From 1 January 2026, IMT on a home that is not your main residence starts at 1% and rises through bands, up to a single 7.5% rate above €1,150,853. Since May 2026, non-resident buyers of housing pay a single 7.5% IMT rate, unless they were tax resident in Portugal before or become resident within two years. Each property page has a calculator.',
        'q_gv': 'Does buying property {in_n} qualify for the Golden Visa?',
        'a_gv': 'No. The direct real-estate route to the Golden Visa closed in October 2023. As of 2026 the Golden Visa is obtained through other investments, such as regulated investment funds. Buying a home can still support a residence application under other visas, such as the D2 for entrepreneurs. We advise on both.',
        'q_us': 'Do you act for the buyer?',
        'a_us': 'Yes. We are independent advisers acting on behalf of the buyer. Through partnerships with large and small agencies we can show you most of the market, then handle due diligence, purchase, residency and management. Real estate mediation is carried out by Benefit Discovery, Lda, AMI 27772.',
    },
    'pt': {
        'title': 'Imóveis à venda {in_n} | Smith &amp; Adams',
        'h1': 'Imóveis à venda {in_n}',
        'label': 'Imobiliário · {n}',
        'facts': '{n} em números', 'why': 'Porquê investir {in_n}', 'listings': 'Imóveis {in_n}',
        'see_all': 'Ver os {c} imóveis {in_n}', 'see_all_short': 'Ver todos os imóveis',
        'price_m2': 'Valor mediano por m² das casas vendidas', 'rent_m2': 'Renda mensal mediana por m² dos novos contratos',
        'yield': 'Rentabilidade bruta indicativa', 'yield_note': 'renda × 12 ÷ preço, medianas do INE, não é uma previsão de retorno',
        'our': 'Imóveis que listamos aqui', 'range': 'Preços pedidos nos nossos imóveis',
        'faq': 'Perguntas sobre comprar {in_n}', 'cta_h': 'A pensar {in_n}?',
        'cta_p': 'Diga-nos o seu orçamento e o que o imóvel tem de cumprir. Voltamos com opções de todo o mercado, e não do stock de uma só agência.',
        'cta': 'Fale com um especialista', 'home': 'Início', 're': 'Imobiliário',
        'updated': 'Dados dos imóveis atualizados a {d}.',
        'disclaimer': 'Informação reportada a 2026, de caráter geral, que não constitui aconselhamento jurídico nem fiscal. As regras mudam; confirme a sua situação com um consultor qualificado.',
        'q_cost': 'Quanto custa um imóvel {in_n}?',
        'a_cost_ine': 'Segundo o INE, o valor mediano das casas vendidas em {geo} foi de {p} por metro quadrado em {per}.',
        'a_cost_ours': 'Os preços pedidos nos {c} imóveis que listamos {in_n} vão de {lo} a {hi}, com uma mediana de {md} (a {d}).',
        'q_tax': 'Que impostos pago ao comprar casa {in_n}?',
        'a_tax': 'O comprador paga IMT e Imposto do Selo de 0,8% sobre o preço. Desde 1 de janeiro de 2026, o IMT de uma casa que não seja habitação própria e permanente começa em 1% e sobe por escalões, até uma taxa única de 7,5% acima de 1.150.853 €. Desde maio de 2026, os compradores não residentes de habitação pagam uma taxa única de IMT de 7,5%, salvo se já tiverem sido residentes fiscais em Portugal ou passarem a sê-lo nos dois anos seguintes. Cada página de imóvel tem um simulador.',
        'q_gv': 'Comprar casa {in_n} dá acesso ao Golden Visa?',
        'a_gv': 'Não. A via direta do imobiliário para o Golden Visa terminou em outubro de 2023. Em 2026 o Golden Visa obtém-se através de outros investimentos, como fundos de investimento regulados. A compra de casa pode ainda apoiar um pedido de residência ao abrigo de outros vistos, como o D2 para empreendedores. Aconselhamos em ambos.',
        'q_us': 'Trabalham do lado do comprador?',
        'a_us': 'Sim. Somos consultores independentes, do lado do comprador. Com parcerias com agências grandes e pequenas mostramos-lhe a maior parte do mercado e tratamos da due diligence, da compra, da residência e da gestão. A mediação imobiliária é feita pela Benefit Discovery, Lda, AMI 27772.',
    },
}


def get(q, count=False):
    req = urllib.request.Request(SB + q, headers={'apikey': ANON, 'Authorization': 'Bearer ' + ANON, **({'Prefer': 'count=exact'} if count else {})})
    r = urllib.request.urlopen(req)
    data = json.load(r)
    if count:
        m = re.search(r'/(\d+)', r.headers.get('content-range') or '')
        return data, int(m.group(1)) if m else len(data)
    return data


def quote_q(q):
    # PostgREST filters as written in the shell use raw quotes/accents; encode values for urllib.
    return urllib.parse.quote(q, safe='=&.(),"_-')


def area_data(a):
    rows, off = [], 0
    while True:
        chunk = get(f'properties?status=eq.published&{quote_q(a["q"])}&select=price,cover_image,featured&order=id&limit=1000&offset={off}')
        rows += chunk
        off += 1000
        if len(chunk) < 1000:
            break
    prices = sorted(r['price'] for r in rows if r['price'])
    hero = get(f'properties?status=eq.published&{quote_q(a["q"])}&cover_image=not.is.null&select=cover_image&order=featured.desc,price.desc.nullslast&limit=1')
    return {'count': len(rows), 'lo': prices[0] if prices else None, 'hi': prices[-1] if prices else None,
            'md': statistics.median(prices) if prices else None, 'hero': hero[0]['cover_image'] if hero else ''}


def eur(v, lang):
    s = f'{int(round(v)):,}'
    return ('€' + s) if lang == 'en' else (s.replace(',', '.') + ' €')


def shell():
    src = (ROOT / 'index.html').read_text().split('\n')
    hero = next(n for n, l in enumerate(src) if 'class="rd-hero"' in l) - 1
    close = next(n for n, l in enumerate(src) if 'CLOSING' in l)
    head, tail = '\n'.join(src[:hero]), '\n'.join(src[close:])
    tail = tail[tail.index('<footer'):]
    fix = lambda s: re.sub(r'(href|src|srcSet|srcset)="\./', r'\1="/',
                           re.sub(r'(href|src)="((?:_next/|favicon)[^"]*|[a-z0-9-]+\.html)"', r'\1="/\2"', s))
    head, tail = fix(head), fix(tail)
    # the homepage-only stylesheet and script are not needed here
    head = head.replace('\n<link rel="stylesheet" href="/home.css?v=1" />', '')
    tail = tail.replace('\n    <script src="/home.js?v=1" defer></script>', '')
    return head, tail


CSS = """
<style id="area-css">
.ar-hero{position:relative;min-height:min(72vh,680px);display:flex;align-items:flex-end;background:var(--navy);overflow:hidden}
.ar-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ar-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,34,45,.6) 0%,rgba(17,34,45,.25) 35%,rgba(17,34,45,.88) 100%)}
.ar-hero .rd-wrap{position:relative;z-index:1;width:100%;padding-bottom:clamp(36px,5vw,72px)}
.ar-hero .rd-label{color:var(--stone)}
.ar-hero h1{color:#fff;font-family:var(--display);font-weight:500;font-size:clamp(34px,5vw,72px);line-height:1.04;letter-spacing:-.015em;margin:14px 0 0}
.ar-hero p.lede{color:#e6ebee;font-family:var(--sans);font-weight:300;font-size:clamp(16px,1.35vw,19px);line-height:1.6;max-width:62ch;margin:18px 0 0}
.ar-sec{padding:clamp(48px,6vw,84px) 0;background:var(--paper)}
.ar-sec h2{font-family:var(--display);font-weight:500;color:var(--navy);font-size:clamp(26px,3vw,40px);letter-spacing:-.01em;margin:0}
.ar-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:24px;margin:clamp(24px,3vw,36px) 0 0;border-top:1px solid var(--navy)}
.ar-facts div{padding:18px 18px 18px 0;border-bottom:1px solid var(--line)}
.ar-facts dt{font:500 11px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--slate)}
.ar-facts dd{margin:8px 0 0;font:500 clamp(24px,2.4vw,32px) var(--display);color:var(--navy)}
.ar-facts small{display:block;font:12.5px/1.5 var(--sans);color:var(--slate);margin-top:6px}
.ar-src{font:12.5px/1.6 var(--sans);color:var(--slate);margin:14px 0 0;max-width:90ch}
.ar-why{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:clamp(24px,3vw,36px);border-top:1px solid rgba(17,34,45,.16)}
.ar-why div{padding:26px 28px 26px 0;border-bottom:1px solid rgba(17,34,45,.16)}
.ar-why div:nth-child(even){padding-left:28px;border-left:1px solid rgba(17,34,45,.16)}
.ar-why h3{font:500 19px var(--display);color:var(--navy);margin:0}
.ar-why p{font:15px/1.7 var(--sans);color:var(--ink);margin:10px 0 0}
.ar-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}
.ar-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:clamp(24px,3vw,36px)}
.ar-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:2px;overflow:hidden;text-decoration:none;color:inherit}
.ar-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.ar-card div{padding:16px 18px 18px}
.ar-card p{margin:0;font:11.5px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--slate)}
.ar-card h3{margin:6px 0 10px;font:500 18px/1.3 var(--display);color:var(--navy)}
.ar-card span{font:600 16px var(--sans);color:var(--navy)}
.ar-btn{display:inline-flex;align-items:center;gap:9px;background:var(--navy);color:#fff;text-decoration:none;font:600 14px var(--sans);padding:13px 22px;border-radius:2px}
.ar-faq{margin-top:clamp(20px,3vw,32px);border-top:1px solid var(--line);max-width:900px}
.ar-faq details{border-bottom:1px solid var(--line)}
.ar-faq summary{cursor:pointer;list-style:none;padding:20px 0;font:500 18px var(--display);color:var(--navy);display:flex;justify-content:space-between;gap:20px}
.ar-faq summary::after{content:"+";font-family:var(--sans);color:var(--slate)}
.ar-faq details[open] summary::after{content:"\\2212"}
.ar-faq p{font:15.5px/1.75 var(--sans);color:var(--ink);margin:0 0 20px;max-width:75ch}
.ar-cta{background:var(--navy);text-align:center}
.ar-cta h2{color:#fff}
.ar-cta p{color:var(--stone);font:16px/1.7 var(--sans);max-width:56ch;margin:16px auto 0}
.ar-cta .rd-cta{margin-top:28px}
@media(max-width:860px){.ar-why,.ar-grid,.ar-facts{grid-template-columns:1fr}.ar-why div:nth-child(even){padding-left:0;border-left:0}}
</style>"""


def esc(s):
    return html.escape(str(s), quote=True)


def build(a, d, lang, head, tail, today):
    U = UI[lang]
    n = a['name'][lang]
    in_n = a['in_pt'] if lang == 'pt' else a.get('in_en', 'in ' + n)
    pre = '' if lang == 'en' else '/pt'
    en_url, pt_url = f'{SITE}/real-estate/{a["slug"]}', f'{SITE}/pt/real-estate/{a["slug"]}'
    url = en_url if lang == 'en' else pt_url
    title = U['title'].format(n=n, in_n=in_n)
    desc = re.sub(r'<[^>]+>', '', html.unescape(a['lede'][lang]))
    desc = desc if len(desc) <= 158 else desc[:155].rsplit(' ', 1)[0] + '...'
    dstr = today.strftime('%d %b %Y') if lang == 'en' else today.strftime('%d/%m/%Y')

    st = STATS.get(a['slug']) or []
    faqs = []
    cost = [U['a_cost_ine'].format(geo=g['geo'][lang], p=eur(g['price'], lang), per=PER[lang]) for g in st]
    if d['count'] and d['lo']:
        cost.append(U['a_cost_ours'].format(c=d['count'], n=n, in_n=in_n, lo=eur(d['lo'], lang), hi=eur(d['hi'], lang), md=eur(d['md'], lang), d=dstr))
    if cost:
        faqs.append((U['q_cost'].format(n=n, in_n=in_n), ' '.join(cost)))
    faqs += [(U['q_tax'].format(n=n, in_n=in_n), U['a_tax']), (U['q_gv'].format(n=n, in_n=in_n), U['a_gv']), (U['q_us'], U['a_us'])]

    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head, count=1)
    h = re.sub(r'<meta name="description"[^>]*>', f'<meta name="description" content="{esc(desc)}" />', h, count=1)
    h = re.sub(r'<link rel="canonical"[^\n]*',
               f'<link rel="canonical" href="{url}" /><link rel="alternate" hreflang="en" href="{en_url}"/>'
               f'<link rel="alternate" hreflang="pt" href="{pt_url}"/><link rel="alternate" hreflang="x-default" href="{en_url}"/>', h, count=1)
    h = re.sub(r'<meta property="og:url"[^>]*>', f'<meta property="og:url" content="{url}" />', h, count=1)
    h = re.sub(r'<meta property="og:title"[^>]*>', f'<meta property="og:title" content="{title}" />', h, count=1)
    h = re.sub(r'<meta property="og:description"[^>]*>', f'<meta property="og:description" content="{esc(desc)}" />', h, count=1)
    if d['hero']:
        h = re.sub(r'<meta property="og:image"[^>]*>', f'<meta property="og:image" content="{esc(d["hero"])}" />', h, count=1)
    h = re.sub(r'<script type="application/ld\+json">.*?</script>', '', h, flags=re.S)
    h = re.sub(r'<link rel="preload" as="image"[^>]*>', '', h)
    if lang == 'pt':
        h = h.replace('<html lang="en"', '<html lang="pt"')
    plain = lambda s: re.sub(r'<[^>]+>', '', html.unescape(s))
    ld = [
        {'@context': 'https://schema.org', '@type': 'FAQPage',
         'mainEntity': [{'@type': 'Question', 'name': plain(q), 'acceptedAnswer': {'@type': 'Answer', 'text': plain(ans)}} for q, ans in faqs]},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': U['home'], 'item': SITE + (pre or '/')},
            {'@type': 'ListItem', 'position': 2, 'name': U['re'], 'item': f'{SITE}{pre}/real-estate'},
            {'@type': 'ListItem', 'position': 3, 'name': n, 'item': url}]},
    ]
    h = h.replace('</head>', ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld) + CSS + '\n</head>', 1)

    facts = []
    num = (lambda x, dp: f'{x:.{dp}f}') if lang == 'en' else (lambda x, dp: f'{x:.{dp}f}'.replace('.', ','))
    multi = len(st) > 1
    for g in st:
        tag = (' · ' + g['geo'][lang]) if multi else ''
        yoy = (f' · {"+" if g["yoy"] > 0 else ""}{num(g["yoy"], 1)}% ' + ('year on year' if lang == 'en' else 'em termos homólogos')) if g.get('yoy') else ''
        facts.append((U['price_m2'] + tag, eur(g['price'], lang), PER[lang] + yoy))
        facts.append((U['rent_m2'] + tag, ('€' + num(g['rent'], 2)) if lang == 'en' else (num(g['rent'], 2) + ' €'), PER[lang]))
        facts.append((U['yield'] + tag, num(g['rent'] * 12 / g['price'] * 100, 1) + '%', U['yield_note']))
    if d['count']:
        facts.append((U['our'], str(d['count']), U['updated'].format(d=dstr)))
    if d['lo']:
        facts.append((U['range'], f'{eur(d["lo"], lang)} - {eur(d["hi"], lang)}', 'Median ' + eur(d['md'], lang) if lang == 'en' else 'Mediana ' + eur(d['md'], lang)))
    facts_html = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd><small>{esc(s)}</small></div>' for k, v, s in facts)
    note = STATS_NOTE.get(a['slug'], {}).get(lang, '')
    src_html = (f'<p class="ar-src">{note} {STATS_SOURCE[lang]}</p>' if st else '')
    why = ''.join(f'<div><h3>{esc(t)}</h3><p>{esc(p)}</p></div>' for t, p in a['why'][lang])
    faq_html = ''.join(f'<details name="ar-faq"><summary>{esc(q)}</summary><p>{ans}</p></details>' for q, ans in faqs)
    all_url = f'{pre}/real-estate?area={a["slug"]}'

    body = f'''        <!-- ══════════════════ AREA · {esc(n)} ══════════════════ -->
        <section class="ar-hero">
            {f'<img src="{esc(d["hero"])}" alt="" fetchpriority="high" decoding="async">' if d['hero'] else ''}
            <div class="rd-wrap">
                <p class="rd-label">{esc(U['label'].format(n=n, in_n=in_n))}</p>
                <h1>{esc(U['h1'].format(n=n, in_n=in_n))}</h1>
                <p class="lede">{a['lede'][lang]}</p>
            </div>
        </section>
        <section class="ar-sec">
            <div class="rd-wrap">
                <h2>{esc(U['facts'].format(n=n, in_n=in_n))}</h2>
                <dl class="ar-facts">{facts_html}</dl>{src_html}
            </div>
        </section>
        <section class="ar-sec" style="background:var(--sunken)">
            <div class="rd-wrap">
                <h2>{esc(U['why'].format(n=n, in_n=in_n))}</h2>
                <div class="ar-why">{why}</div>
            </div>
        </section>
        <section class="ar-sec">
            <div class="rd-wrap">
                <div class="ar-top"><h2>{esc(U['listings'].format(n=n, in_n=in_n))}</h2>
                <a class="ar-btn" href="{all_url}">{esc(U['see_all'].format(c=d['count'], n=n, in_n=in_n) if d['count'] else U['see_all_short'])} &rarr;</a></div>
                <div class="ar-grid" id="ar-grid" data-q="{esc(a['q'])}" data-lang="{lang}"></div>
            </div>
        </section>
        <section class="ar-sec" style="padding-top:0">
            <div class="rd-wrap">
                <h2>{esc(U['faq'].format(n=n, in_n=in_n))}</h2>
                <div class="ar-faq">{faq_html}</div>
                <p class="ar-src">{U['disclaimer']}</p>
            </div>
        </section>
        <section class="ar-sec ar-cta">
            <div class="rd-wrap">
                <h2>{esc(U['cta_h'].format(n=n, in_n=in_n))}</h2>
                <p>{U['cta_p']}</p>
                <a class="rd-cta" href="{pre}/contact">{esc(U['cta'])} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            </div>
        </section>
        <script>
        (function(){{
          var g=document.getElementById('ar-grid'),pt=g.getAttribute('data-lang')==='pt',K='{ANON}';
          fetch('{SB}properties?status=eq.published&'+g.getAttribute('data-q')+'&cover_image=not.is.null&select=slug,title,cover_image,price,city,region,upcoming&order=featured.desc,created_at.desc&limit=6',{{headers:{{apikey:K,Authorization:'Bearer '+K}}}})
            .then(function(r){{return r.json();}}).then(function(rows){{
              if(!Array.isArray(rows))return;
              var e=function(s){{return String(s==null?'':s).replace(/[&<>"]/g,function(c){{return{{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c];}});}};
              var tl=function(o){{return o==null?'':(typeof o==='string'?o:((pt?o.pt:o.en)||o.en||o.pt||''));}};
              g.innerHTML=rows.map(function(p){{return '<a class="ar-card" href="{pre}/property/'+encodeURIComponent(p.slug)+'"><img src="'+e(p.cover_image)+'" alt="'+e(tl(p.title))+'" loading="lazy"><div><p>'+e([p.city,p.region].filter(Boolean).join(', '))+'</p><h3>'+e(tl(p.title))+'</h3>'+(p.price?'<span>'+(p.upcoming?(pt?'Desde ':'From '):'')+(pt?Number(p.price).toLocaleString('pt-PT')+' €':'€'+Number(p.price).toLocaleString('en-GB'))+'</span>':'')+'</div></a>';}}).join('');
            }}).catch(function(){{}});
        }})();
        </script>
'''
    return h + '\n' + body + tail


def main():
    head, tail = shell()
    today = date.today()
    for a in AREAS:
        d = area_data(a)
        for lang, base in (('en', ROOT / 'real-estate'), ('pt', ROOT / 'pt' / 'real-estate')):
            base.mkdir(parents=True, exist_ok=True)
            (base / f'{a["slug"]}.html').write_text(build(a, d, lang, head, tail, today))
        print(a['slug'], d['count'], d['lo'], d['hi'])


if __name__ == '__main__':
    main()
