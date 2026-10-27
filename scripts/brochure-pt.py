#!/usr/bin/env python3
"""Write the Portuguese brochure sources from the English ones.

    python3 scripts/brochure-pt.py      # then scripts/build-brochure.sh group-pt / pm-pt

Every English string below must still exist in the EN source; if the EN copy
changes, this script stops and names the string, so the PT never drifts.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'docs' / 'brochure'

COMMON = [
    ('<html lang="en">', '<html lang="pt">'),
    ('<p class="k">Phone</p>', '<p class="k">Telefone</p>'),
    ('<p class="k">Website</p>', '<p class="k">Site</p>'),
    ('<p class="k">Lisbon office</p>', '<p class="k">Escritório de Lisboa</p>'),
    ('<h2 style="margin-top:18mm;font-size:32pt">Speak with an expert.</h2>', '<h2 style="margin-top:18mm;font-size:32pt">Fale com um especialista.</h2>'),
]

GROUP = COMMON + [
    ('<title>Smith &amp; Adams Group brochure</title>', '<title>Brochura Smith &amp; Adams Group</title>'),
    ('<h1>Property investment made easy.</h1>', '<h1>Investimento imobiliário, simplificado.</h1>'),
    ('An independent real estate group providing end-to-end solutions for foreign investors in Portugal.', 'Um grupo imobiliário independente com soluções completas para investidores estrangeiros em Portugal.'),
    ('GROUP BROCHURE · 2026', 'BROCHURA DO GRUPO · 2026'),
    ('<p class="lab">Who we are</p>', '<p class="lab">Quem somos</p>'),
    ('Owning property, without the work of owning property.', 'Ter um imóvel, sem o trabalho de ter um imóvel.'),
    ('Smith &amp; Adams began as the answer to a problem we had ourselves: a portfolio of properties, rental commitments to honour and no one on the ground able to run them to the standard they needed. So we ran them ourselves, and learned the market from the inside.',
     'A Smith &amp; Adams nasceu como resposta a um problema que era nosso: uma carteira de imóveis, compromissos de arrendamento para cumprir e ninguém no terreno capaz de os gerir ao nível que exigiam. Por isso, passámos a geri-los nós, e aprendemos o mercado por dentro.'),
    ('That is the position most foreign investors are in. You do not know the local market, the builders who charge a fair price, or how an asset is run once the keys change hands. We are the partner on the ground: experts in every field you need, from the first analysis to long-term ownership, including residency and citizenship in Portugal.',
     'É nessa posição que está a maioria dos investidores estrangeiros. Não conhece o mercado local, os construtores que praticam preços justos, nem a forma como um ativo é gerido depois da entrega das chaves. Somos o parceiro no terreno: especialistas em cada área de que precisa, da primeira análise à propriedade de longo prazo, incluindo a residência e a cidadania em Portugal.'),
    ('We also own and operate our own brands, Hygge Kaffe and Hygge Residences, so the standard we advise on is the one we hold ourselves to every day.',
     'Somos também donos e operadores das nossas marcas, Hygge Kaffe e Hygge Residences, por isso o padrão que aconselhamos é o mesmo que cumprimos todos os dias.'),
    ('<p class="n">1,000+</p><p class="t">Investors advised</p>', '<p class="n">1.000+</p><p class="t">Investidores aconselhados</p>'),
    ('<p class="t">In advised investment value</p>', '<p class="t">Em valor de investimento aconselhado</p>'),
    ('<p class="t">Assets under management</p>', '<p class="t">Ativos sob gestão</p>'),
    ('<p class="t">Residency applications approved</p>', '<p class="t">Pedidos de residência aprovados</p>'),
    ('SMITH &amp; ADAMS GROUP</span>', 'SMITH &amp; ADAMS GROUP</span>'),
    ('<p class="lab">What we do</p>', '<p class="lab">O que fazemos</p>'),
    ('One group for the whole of a tangible asset.', 'Um só grupo para todo o ciclo de um ativo tangível.'),
    ('<h3>Investment Advisory</h3>', '<h3>Consultoria de Investimento</h3>'),
    ('Independent advice on where and what to buy, including Golden Visa, D2 residency and the route to EU citizenship.', 'Aconselhamento independente sobre onde e o que comprar, incluindo Golden Visa, residência D2 e o caminho para a cidadania europeia.'),
    ('<h3>Real Estate</h3>', '<h3>Imobiliário</h3>'),
    ("Access to every property on the market, not one developer's stock, with relocation and lifestyle support for you and your family.", 'Acesso a todos os imóveis do mercado, e não apenas ao stock de um promotor, com apoio à mudança e ao estilo de vida para si e para a sua família.'),
    ('<h3>Property Management</h3>', '<h3>Gestão de Propriedades</h3>'),
    ('Short and long-term rentals, asset and condominium management, utilities and upkeep, run to get the most from the asset.', 'Arrendamento de curta e longa duração, gestão do ativo e do condomínio, utilidades e manutenção, para tirar o máximo partido do ativo.'),
    ('<h3>Hospitality &amp; F&amp;B</h3>', '<h3>Hotelaria e Restauração</h3>'),
    ('Branded residences and the brands behind them. We own and operate Hygge, from serviced apartments to restaurants.', 'Residências de marca e as marcas por trás delas. Somos donos e operadores da Hygge, de apartamentos com serviços a restaurantes.'),
    ('smithandadams.com/invest-in-portugal', 'smithandadams.com/pt/invest-in-portugal'),
    ('smithandadams.com/real-estate', 'smithandadams.com/pt/real-estate'),
    ('<p class="u">smithandadams.com/property-management</p>', '<p class="u">smithandadams.com/pt/property-management</p>'),
    ('<p class="lab">How we can help</p>', '<p class="lab">Como podemos ajudar</p>'),
    ('Three steps, one team.', 'Três passos, uma só equipa.'),
    ('<p class="k">Step one</p><h3>Understand your needs</h3><p>An initial consultation about what you want the asset to do: income, growth, residency, a home, or all of them.</p>',
     '<p class="k">Passo um</p><h3>Perceber as suas necessidades</h3><p>Uma primeira conversa sobre o que quer que o ativo faça: rendimento, valorização, residência, uma casa, ou tudo isto.</p>'),
    ('<p class="k">Step two</p><h3>Find the solution</h3><p>Independent advice on the options that fit, with no upfront cost and no obligation to proceed.</p>',
     '<p class="k">Passo dois</p><h3>Encontrar a solução</h3><p>Aconselhamento independente sobre as opções certas, sem custos iniciais e sem compromisso.</p>'),
    ('<p class="k">Step three</p><h3>Execution</h3><p>We carry it through, then run the asset for profit, efficiency and use, and report on it.</p>',
     '<p class="k">Passo três</p><h3>Execução</h3><p>Levamos tudo até ao fim e depois gerimos o ativo a pensar na rentabilidade, na eficiência e na utilização, com relatórios regulares.</p>'),
    ('A typical client journey', 'O percurso típico de um cliente'),
    ('<b>Investment advisory</b><span>Strategy, budget and location, including Golden Visa or D2 where residency is part of the plan.</span>', '<b>Consultoria de investimento</b><span>Estratégia, orçamento e localização, incluindo Golden Visa ou D2 quando a residência faz parte do plano.</span>'),
    ('<span>Our investment team and lawyers check the asset, the title and the numbers.</span>', '<span>A nossa equipa de investimento e os advogados verificam o ativo, o registo e os números.</span>'),
    ('<b>Project management</b><span>For properties under construction, we follow the works and the developer for you.</span>', '<b>Gestão de projeto</b><span>Nos imóveis em construção, acompanhamos a obra e o promotor por si.</span>'),
    ('<b>Handover and snagging</b><span>Defects listed and closed before the keys change hands.</span>', '<b>Entrega e vistoria</b><span>Defeitos identificados e resolvidos antes da entrega das chaves.</span>'),
    ('<b>Asset management</b><span>Furnishing, licensing, condominium, utilities and maintenance.</span>', '<b>Gestão do ativo</b><span>Mobiliário, licenciamento, condomínio, utilidades e manutenção.</span>'),
    ('<b>Rental management</b><span>Short or long-term letting, priced and run for occupancy and yield.</span>', '<b>Gestão do arrendamento</b><span>Arrendamento de curta ou longa duração, com preço e gestão pensados para a ocupação e a rentabilidade.</span>'),
    ('<b>Reporting</b><span>Income, costs and occupancy, in the same format every quarter.</span>', '<b>Relatórios</b><span>Receitas, custos e ocupação, no mesmo formato todos os trimestres.</span>'),
    ('<b>Exit and resale</b><span>When the time comes, we value, market and sell the asset for you.</span>', '<b>Saída e revenda</b><span>Quando chegar a altura, avaliamos, promovemos e vendemos o ativo por si.</span>'),
    ('<p class="lab">The group</p>', '<p class="lab">O grupo</p>'),
    ('One group, six brands.', 'Um grupo, seis marcas.'),
    ('Our own restaurant brand, run in-house across three Lisbon locations.', 'A nossa marca de restauração, gerida internamente em três espaços em Lisboa.'),
    ('Branded residences and serviced apartments, delivered, let and operated by the group.', 'Residências de marca e apartamentos com serviços, entregues, arrendados e operados pelo grupo.'),
    ('Independent investment, residency and citizenship advice for international buyers.', 'Consultoria independente de investimento, residência e cidadania para compradores internacionais.'),
    ('Residential real estate across Portugal, vetted before it reaches you.', 'Imobiliário residencial em todo o país, verificado antes de chegar a si.'),
    ('Guests or tenants, maintenance, condominium and utilities, reported every quarter.', 'Hóspedes ou inquilinos, manutenção, condomínio e utilidades, com relatórios trimestrais.'),
    ('Develops and runs the restaurants inside our hospitality projects.', 'Desenvolve e opera os restaurantes dos nossos projetos de hotelaria.'),
    ('<p class="lab">Case studies</p>', '<p class="lab">Casos de estudo</p>'),
    ('Assets we own, run and report on.', 'Ativos que detemos, gerimos e acompanhamos.'),
    ('<p class="pl">Baixa, Lisbon</p>', '<p class="pl">Baixa, Lisboa</p>'),
    ('Twelve apartments and a restaurant that we specified, delivered and still run.', 'Doze apartamentos e um restaurante que especificámos, entregámos e continuamos a gerir.'),
    ('<p class="pl">Anjos, Lisbon</p>', '<p class="pl">Anjos, Lisboa</p>'),
    ('Eight apartments held and let since 2021, with a cost line kept short.', 'Oito apartamentos detidos e arrendados desde 2021, com custos controlados.'),
    ('<p class="pl">Picoas, Lisbon</p>', '<p class="pl">Picoas, Lisboa</p>'),
    ('Serviced apartments and food and beverage under one brand and one operator.', 'Apartamentos com serviços e restauração, com uma só marca e um só operador.'),
    ('<p class="pl">Lisbon</p>', '<p class="pl">Lisboa</p>'),
    ('Our own restaurant brand, built and run in-house across three locations.', 'A nossa marca de restauração, criada e gerida internamente em três espaços.'),
    ('<dt>Units</dt><dd>12</dd></div><div><dt>Occupancy</dt><dd>85.2%</dd></div><div><dt>Since</dt>', '<dt>Unidades</dt><dd>12</dd></div><div><dt>Ocupação</dt><dd>85,2%</dd></div><div><dt>Desde</dt>'),
    ('<dt>Units</dt><dd>8</dd></div><div><dt>Occupancy</dt><dd>86.3%</dd></div><div><dt>Since</dt>', '<dt>Unidades</dt><dd>8</dd></div><div><dt>Ocupação</dt><dd>86,3%</dd></div><div><dt>Desde</dt>'),
    ('<dt>Units</dt><dd>9</dd></div><div><dt>Model</dt><dd>Stay + F&amp;B</dd>', '<dt>Unidades</dt><dd>9</dd></div><div><dt>Modelo</dt><dd>Alojamento + restauração</dd>'),
    ('<dt>Locations</dt><dd>3</dd></div><div><dt>Margin</dt><dd>23%</dd></div><div><dt>Since</dt>', '<dt>Espaços</dt><dd>3</dd></div><div><dt>Margem</dt><dd>23%</dd></div><div><dt>Desde</dt>'),
    ('Occupancy measured from 6 August 2025 to 6 August 2026. Source: Boom, the platform the buildings are booked through. Past performance does not guarantee future results.',
     'Ocupação medida entre 6 de agosto de 2025 e 6 de agosto de 2026. Fonte: Boom, a plataforma através da qual os edifícios são reservados. Resultados passados não garantem resultados futuros.'),
    ('No obligation and no upfront cost. Just a clear view of what is possible, and whether residency belongs in the plan.', 'Sem compromisso e sem custos iniciais. Apenas uma visão clara do que é possível, e se a residência faz sentido no plano.'),
    ('<p class="k">Dubai office</p>', '<p class="k">Escritório do Dubai</p>'),
    ('Al Goze Industrial First, Dubai, United Arab Emirates', 'Al Goze Industrial First, Dubai, Emirados Árabes Unidos'),
    ('Real estate mediation by Benefit Discovery, Lda, AMI 27772 (IMPIC). This brochure is for information only and is not investment, legal or tax advice. Figures as at October 2026.',
     'Mediação imobiliária pela Benefit Discovery, Lda, AMI 27772 (IMPIC). Esta brochura é meramente informativa e não constitui aconselhamento de investimento, jurídico ou fiscal. Dados de outubro de 2026.'),
]

PM = COMMON + [
    ('<title>S&amp;A Property Management brochure</title>', '<title>Brochura S&amp;A Property Management</title>'),
    ('<h1>End-to-end property management.</h1>', '<h1>Gestão de propriedades de ponta a ponta.</h1>'),
    ("We take care of every aspect of property ownership so you don't have to: hands-off, tailored to your needs and built to maximise your returns.", 'Tratamos de todos os aspetos de ter um imóvel para que não tenha de o fazer: sem preocupações, à medida das suas necessidades e pensado para maximizar o seu retorno.'),
    ('PROPERTY MANAGEMENT · 2026', 'GESTÃO DE PROPRIEDADES · 2026'),
    ('WWW.SMITHANDADAMS.COM/PROPERTY-MANAGEMENT', 'WWW.SMITHANDADAMS.COM/PT/PROPERTY-MANAGEMENT'),
    ('<p class="lab">Why property management</p>', '<p class="lab">Porquê gestão de propriedades</p>'),
    ('Owning abroad is not hands-off by default.', 'Ter um imóvel noutro país não dispensa trabalho por si só.'),
    ('<b>Asset and property management.</b> As a foreign owner you cannot easily set up water and electricity, wait in for a repair or chase a contractor. We handle all of it: utility contracts, a broken boiler, a leak, insurance claims and the paperwork. We represent you at condominium meetings and act as your tax representative where needed.',
     '<b>Gestão do ativo e do imóvel.</b> Como proprietário estrangeiro, não é fácil ligar a água e a luz, esperar por uma reparação ou ir atrás de um empreiteiro. Tratamos de tudo: contratos de serviços, uma caldeira avariada, uma infiltração, participações ao seguro e a burocracia. Representamo-lo nas reuniões de condomínio e somos o seu representante fiscal quando é necessário.'),
    ('<b>Rental management.</b> We set prices by season and demand, manage listings on Airbnb, Booking.com and our own channel, look after guests or tenants from first message to check-out, and keep the home in a condition that earns good reviews. The aim: high occupancy, a strong net yield and an asset that holds its value.',
     '<b>Gestão do arrendamento.</b> Definimos preços por época e procura, gerimos os anúncios no Airbnb, no Booking.com e no nosso canal próprio, acompanhamos hóspedes ou inquilinos da primeira mensagem ao check-out e mantemos a casa num estado que gera boas avaliações. O objetivo: ocupação elevada, uma boa rentabilidade líquida e um ativo que mantém o valor.'),
    ('<p class="t">Homes under management</p>', '<p class="t">Casas sob gestão</p>'),
    ('<p class="t">Average occupancy across active homes</p>', '<p class="t">Ocupação média das casas ativas</p>'),
    ('<p class="t">Of active homes above 80% occupancy</p>', '<p class="t">Das casas ativas acima de 80% de ocupação</p>'),
    ('<p class="n">4.7/5</p><p class="t">Guest rating for communication</p>', '<p class="n">4,7/5</p><p class="t">Avaliação dos hóspedes à comunicação</p>'),
    ('S&amp;A PROPERTY MANAGEMENT</span>', 'S&amp;A PROPERTY MANAGEMENT</span>'),
    ('<p class="lab">How does it work?</p>', '<p class="lab">Como funciona?</p>'),
    ('Six steps, one team.', 'Seis passos, uma só equipa.'),
    ('>Step one<', '>Passo um<'), ('>Step two<', '>Passo dois<'), ('>Step three<', '>Passo três<'),
    ('>Step four<', '>Passo quatro<'), ('>Step five<', '>Passo cinco<'), ('>Step six<', '>Passo seis<'),
    ('Consultation and assessment', 'Consulta e avaliação'),
    ('We visit the property, review its condition, licensing and running costs, and show you what it can realistically earn.', 'Visitamos o imóvel, analisamos o estado, o licenciamento e os custos de funcionamento, e mostramos-lhe o que pode realisticamente render.'),
    ('Set-up and compliance', 'Preparação e conformidade'),
    ('Furnishing where needed, photography, the local accommodation licence, insurance and integration with our systems.', 'Mobiliário quando necessário, fotografia, a licença de alojamento local, o seguro e a integração nos nossos sistemas.'),
    ('Pricing and distribution', 'Preço e distribuição'),
    ('Listings on Airbnb, Booking.com and our own channel, priced to season and demand.', 'Anúncios no Airbnb, no Booking.com e no nosso canal próprio, com preços ajustados à época e à procura.'),
    ('Guests and tenants', 'Hóspedes e inquilinos'),
    ('Every message, check-in and check-out handled, with issues resolved on the ground.', 'Todas as mensagens, check-ins e check-outs tratados, com os problemas resolvidos no terreno.'),
    ('Housekeeping and asset care', 'Limpeza e cuidado do ativo'),
    ('Cleaning, inspections, repairs, utilities and condominium matters.', 'Limpeza, inspeções, reparações, utilidades e assuntos de condomínio.'),
    ('Payments and reporting', 'Pagamentos e relatórios'),
    ('Income collected, expenses paid, a monthly statement and a quarterly net-of-cost review.', 'Receitas recebidas, despesas pagas, um extrato mensal e uma análise trimestral líquida de custos.'),
    ('<p class="lab">What is included</p>', '<p class="lab">O que está incluído</p>'),
    ('Full-cycle care for your property.', 'Cuidado completo para o seu imóvel.'),
    ('Property health checks and investment reviews', 'Inspeções e revisões do investimento'),
    ('Inspections with detailed reports, photographs and condition assessments, so issues are caught early.', 'Inspeções com relatórios detalhados, fotografias e avaliação do estado, para detetar problemas cedo.'),
    ('Asset preservation and maintenance', 'Preservação e manutenção do ativo'),
    ('All maintenance and repairs, with trusted contractors coordinated on your behalf.', 'Toda a manutenção e reparações, com empreiteiros de confiança coordenados por si.'),
    ('Key holding and emergency response', 'Guarda de chaves e emergências'),
    ('Secure key holding and a fast response for emergencies, inspections and contractor access.', 'Guarda segura das chaves e resposta rápida a emergências, inspeções e acesso de empreiteiros.'),
    ('Condominium representation', 'Representação no condomínio'),
    ('Your representative at condominium meetings, with the management company and on annual levies.', 'O seu representante nas reuniões de condomínio, junto da empresa de gestão e nas quotas anuais.'),
    ('Insurance assistance and claims', 'Seguros e participações'),
    ('Suitable cover for the property and hands-on support through any claim.', 'O seguro adequado para o imóvel e acompanhamento em qualquer participação.'),
    ('Rental and compliance support', 'Arrendamento e conformidade'),
    ('Licensing, documentation and compliance for short, medium and long-term rentals.', 'Licenciamento, documentação e conformidade para arrendamentos de curta, média e longa duração.'),
    ('Tax representation', 'Representação fiscal'),
    ('Your tax representative in Portugal: IMI, rental income, lease registration and annual returns.', 'O seu representante fiscal em Portugal: IMI, rendimentos prediais, registo de contratos e declarações anuais.'),
    ('Investment enhancement', 'Valorização do investimento'),
    ('Upgrades, furnishing, energy efficiency and positioning to lift occupancy and resale value.', 'Obras, mobiliário, eficiência energética e posicionamento para aumentar a ocupação e o valor de revenda.'),
    ('Tell us where your property is and how it is used today. We will come back with what it could earn and what managing it would involve.', 'Diga-nos onde fica o seu imóvel e como é usado hoje. Voltamos com o que pode render e o que implica geri-lo.'),
    ('www.smithandadams.com/property-management</p>', 'www.smithandadams.com/pt/property-management</p>'),
    ('<p class="k">Book a stay</p>', '<p class="k">Reservar estadia</p>'),
    ('Figures from our property-management operations across the managed portfolio, 2026. Occupancy and ratings describe past performance and are not a forecast of future income.',
     'Dados das nossas operações de gestão de propriedades em toda a carteira gerida, 2026. A ocupação e as avaliações descrevem resultados passados e não são uma previsão de rendimento futuro.'),
]


def translate(src, dst, pairs):
    s = (D / src).read_text()
    for en, pt in pairs:
        if en not in s:
            sys.exit(f'{src}: English string not found (EN copy changed?): {en[:80]}')
        s = s.replace(en, pt)
    (D / dst).write_text(s)
    print('wrote', dst)


translate('group-brochure.html', 'group-brochure.pt.html', GROUP)
translate('pm-brochure.html', 'pm-brochure.pt.html', PM)
