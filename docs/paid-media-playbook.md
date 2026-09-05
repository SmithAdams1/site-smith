# Paid Media Playbook - Smith & Adams (Google Ads foco)

Fonte-de-verdade para decisões de paid media da S&A. Baseado em melhores práticas
2026 (fontes no fim), aplicado ao nosso caso: aconselhamento de residência/Golden
Visa/D2 para investidores HNW (produto de **alto valor e alta consideração**, YMYL).

---

## 1. Landing page própria vs formulário nativo do Google (lead form asset)

**Recomendação: a NOSSA landing page (`/lp-invest`). Sem hesitar.**

Porquê (é uma decisão de qualidade vs volume):
- Os **lead form assets do Google captam leads de MENOR qualidade** - submissão de 1
  clique, baixa intenção, poucos campos. Bons para ofertas de baixo valor/alto volume
  (ebook, newsletter), **não** para uma decisão de €280k+ que exige confiança e educação.
- Para **B2B de alto valor / alta consideração**, a landing page é o padrão: dá espaço
  para posicionamento ("advisers, not brokers"), prova (€300M+, 1.000+ investidores),
  e **perguntas de qualificação** (household, timeline, investment capacity) que já
  temos. Menos leads, muito melhores.
- A LP dá-nos **tracking + atribuição próprios**, dados first-party para o CRM e
  Enhanced Conversions - o form nativo não.

Quando um lead form nativo faria sentido: campanha separada de topo de funil, oferta
gratuita (guia), só para volume. Não é a nossa prioridade agora.

## 2. Arquitetura de conversões (a correta, e o que estava mal)

**Uma conversão primária por lead, sem dupla contagem.**

- **Caminho ativo:** a LP dispara GA4 `generate_lead` → importado no Google Ads como a
  ação **"generate_lead" (Principal)**. É este o sinal que a campanha otimiza.
- **Erro corrigido (2026-09-05):** o `sa-events.js` disparava também uma conversão
  DIRETA do Google Ads para os labels `w_EoCJ...` e `l5vTC...` - ações que foram
  **removidas** no CRM (bloco 164). Resultado: disparos para ações inexistentes. Foram
  **neutralizados** (labels a `null`); fica só o caminho GA4. Se um dia se criar uma
  ação website direta (menor latência que o import GA4), pôr o label E **despromover o
  import GA4 a Secundário** para não contar duas vezes.

## 3. Enhanced Conversions for Leads (implementado 2026-09-05)

A alavanca nº1 de fiabilidade de medição. Enviamos email + telefone (E.164) first-party
ao Google tag no submit; o Google normaliza + SHA256 e faz match do lead ao clique mesmo
com cookies limitados. **Recupera conversões perdidas a consentimento/ITP.**
- Implementado em `sa-events.js` (`gtag('set','user_data',{email,phone_number})` antes do
  evento) + `lp-invest.html` (passa email + E.164).
- **Falta (no Google Ads UI):** ligar o toggle de **Enhanced Conversions** (2026 é um
  único on/off ao nível da conta / Data Manager). Sem o toggle, o `user_data` é ignorado.

## 4. Consent Mode v2 - usar ADVANCED, não Basic

- **Basic:** bloqueia as tags para quem recusa cookies → zero dados desses.
- **Advanced:** deixa as tags disparar com *cookieless pings* → permite **modelação de
  conversões** (recupera em média >70% das jornadas clique→conversão perdidas ao recusar).
- **Aviso de volume:** a modelação só arranca com **~700 cliques/país/7 dias**. Nós temos
  ~16 cliques no total → a modelação NÃO ajuda ainda. Confirmar que estamos em Advanced
  (em `consent.js`) para não perder dados quando o volume subir.

## 5. O bloqueio nº1 hoje: VOLUME

Com ~16 cliques totais, **nenhuma** estratégia de conversão aprende ("Maximizar
conversões" precisa de ~15-30 conversões para sair da aprendizagem; a modelação precisa
de 700 cliques/semana). A campanha não gera leads porque quase não serve.

**Plano para volume (a executar na conta):**
1. **Bidding:** arrancar em **Maximizar cliques com limite de CPC** (ex.: €5-7) para
   gerar tráfego fiável para a LP; passar a **Maximizar conversões** só após ~15-30
   conversões registadas.
2. **Destino:** garantir que o tráfego pago vai à **`/lp-invest`** instrumentada (não a
   uma DSA → `/portugal`).
3. **Estrutura:** grupos por tema apertado (Golden Visa fundos / D2 residência / EU
   residency), **RSAs** com 3-4 headlines fortes, extensões (sitelinks, callouts).
4. **Negativos:** jobs, free, cheap, salary, tourist, citizenship test, etc.
5. **Orçamento:** subir gradualmente à medida que o CPL estabiliza.

## 6. Checklist "infalível" (medir cada lead)

- [x] LP com posicionamento + qualificação (feito)
- [x] GA4 `generate_lead` → import Ads Principal (ativo)
- [x] Enhanced Conversions no código (email + E.164) (feito 2026-09-05)
- [ ] Toggle Enhanced Conversions ligado no Google Ads (UI)
- [ ] Consent Mode em **Advanced** (confirmar em `consent.js`)
- [ ] Campanha → `/lp-invest` + bidding Max clicks → volume
- [x] Leads no CRM em tempo real (`/api/contact` → assign Benjamin) (feito)

---

## Fontes (2026)
- Lead form vs landing page (qualidade B2B): jyll.ca, hawksem.com, leadsync.me
- Enhanced Conversions for Leads: Google Ads Help 15713840 / 11021502; taggrs.io
- Consent Mode v2 advanced + modelação: Google + stape.io; limiar 700 cliques/7d
