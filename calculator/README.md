# Smith & Adams · Calculadoras de Investimento

Ferramenta web para clientes estimarem os custos e o retorno dos três programas de investimento e residência em Portugal oferecidos pela Smith & Adams Group.

---

## Programas incluídos

| # | Programa | Descrição |
|---|----------|-----------|
| 01 | **D2 Visa** | Residência via aquisição de imóvel |
| 02 | **Golden Visa** | Residência via fundo de investimento (€250 000/unidade) |
| 03 | **Investimento Imobiliário** | Aquisição direta sem programa de residência |

---

## Estrutura do projeto

```
smithandadams-calc/
├── index.html      → Página principal (HTML com estrutura e conteúdo)
├── styles.css      → Estilos — paleta de cores, tipografia, layout
├── app.js          → Lógica das calculadoras + tradução EN/PT
├── vercel.json     → Configuração de deployment no Vercel
└── README.md       → Este ficheiro
```

---

## Como publicar no Vercel (passo a passo)

### Opção A — Via GitHub (recomendado)

1. **Cria um repositório** em [github.com](https://github.com) (pode ser privado)
2. Faz upload dos 4 ficheiros (`index.html`, `styles.css`, `app.js`, `vercel.json`) para o repositório
3. Acede a [vercel.com](https://vercel.com) e clica em **"Add New Project"**
4. Liga a tua conta GitHub e seleciona o repositório criado
5. Deixa todas as definições por defeito e clica em **"Deploy"**
6. Em menos de 1 minuto a ferramenta estará publicada num URL do tipo `https://smithandadams-calc.vercel.app`
7. Para usar o teu próprio domínio (ex: `calculadoras.smithandadams.com`), vai a **Settings → Domains** no painel do Vercel e adiciona o domínio

### Opção B — Via Vercel CLI

```bash
# Instalar a CLI do Vercel (só uma vez)
npm install -g vercel

# Na pasta do projeto
cd smithandadams-calc
vercel

# Seguir as instruções no terminal
# No final, o URL público é mostrado automaticamente
```

### Opção C — Drag & Drop (mais simples)

1. Acede a [vercel.com/new](https://vercel.com/new)
2. Arrasta a **pasta** `smithandadams-calc` para a janela do browser
3. Clica em **"Deploy"**

---

## Actualizações futuras

Para actualizar os valores (taxas, impostos, honorários):

- Abre `app.js`
- As constantes estão concentradas nas funções `calcD2()`, `calcGV()` e `calcInv()`
- Exemplos de valores a actualizar:
  - IMT: `0.065` (6,5%)
  - IVA: `1.23` (23%)
  - Yield anual D2: `0.1038` (10,38%)
  - Valorização anual: `0.07` (7%)
  - Mais-valias: `0.19` (19%)

Depois de guardar o ficheiro, faz commit no GitHub — o Vercel republica automaticamente.

---

## Adicionar o logótipo

No `index.html`, o logótipo está definido em texto (`.brand`). Para substituir por uma imagem SVG:

```html
<!-- Substituir o bloco .brand por: -->
<a href="#" class="brand" aria-label="Smith & Adams Group">
  <img src="logo.svg" alt="Smith & Adams Group" height="48" />
</a>
```

Coloca o ficheiro `logo.svg` na raiz do projecto e actualiza o `height` conforme necessário.

---

## Personalização de cores

No topo de `styles.css` estão todas as variáveis de design:

```css
:root {
  --bg:      #F2EDE3;   /* fundo — creme quente */
  --accent:  #3D4F45;   /* verde floresta — accent principal */
  --ink:     #1A1A1A;   /* texto principal */
  --gold:    #B89968;   /* detalhe dourado */
}
```

---

## Suporte

Para dúvidas técnicas, contactar a equipa de desenvolvimento.

© Smith & Adams Group, Lda. · Av. José Malhoa 14, 7.º andar, 1070-073 Lisboa
