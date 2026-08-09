# Studio v1 — Handoff

_Última actualização: 2026-07-10. Repo: `abiliodiz-cell/site-smith`. Branch `studio-v1` = `main` (mesmo HEAD `c423238`), já em **produção**._

## O que é o Studio
Backoffice unificado em **`/studio.html`** (login Supabase único). Substitui a dispersão de `admin.html` / `admin-v2/v3` / `admin-real-estate.html`. Um só login serve todos — a sessão Supabase é partilhada por `localStorage` (mesmo projectRef, sem `storageKey` custom).

Stack do site: HTML estático + Tailwind CDN + vanilla JS + Supabase (auth/DB/storage) em Vercel. **Não há framework nem build.**

## Estado — o que está feito e em produção

| Passo | O quê | Ficheiros | Estado |
|---|---|---|---|
| 1 | Tabela `pages` (slug, title i18n, blocks jsonb, seo, published, show_in_nav, nav_group/position) + RLS | `schema-studio.sql` | ✅ SQL corrido no Supabase |
| 2 | SSR de `/p/:slug` + renderer de blocos partilhado | `api/page.js`, `lib/renderBlocks.js`, `page.html`, `vercel.json` | ✅ |
| 3 | Shell do `/studio`: login + sidebar + lista de Pages + criar rascunho | `studio.html` | ✅ |
| 4a | Editor (canvas+inspector) + blocos Heading, RichText (Quill), Image | `studio.html` | ✅ |
| 4b | Blocos Image+Text, Gallery, Video, Button/CTA, Divider | `studio.html` | ✅ |
| 4c | Toggle EN/PT, SEO bilingue, Preview (iframe c/ o mesmo renderer do SSR) | `studio.html` | ✅ |
| 5 | `cms-loader.js` injecta automaticamente Studio pages (`published && show_in_nav`) no nav desktop/mobile/footer; `nav_group='properties'` aninha no dropdown Properties | `cms-loader.js` | ✅ *(feito na outra conta)* |
| — | Secção **Site pages** nativa no Studio: edita os campos `site_content` (EN/PT) das páginas à medida existentes, **sem mexer no design** | `studio.html` | ✅ *(feito na outra conta)* |

`main` foi fast-forwarded para o `studio-v1` (8 commits, 0 perdidos) e deployado para produção.

## Arquitectura em 30 segundos
- **Páginas novas / simples** → construtor de blocos → guardadas na tabela `pages` → servidas em `/p/<slug>` por `api/page.js` (que injecta SEO/OG e renderiza os blocos com `lib/renderBlocks.js`).
- **Páginas à medida existentes** (Home, About, Invest, etc.) → **continuam como estão** (design à mão). Só o texto é editável, via `site_content` (key/value/locale), na secção "Site pages". **Decisão deliberada:** não migrar marketing pages à medida para blocos genéricos — perderia o design e não traz valor.
- `renderBlocks.js` é usado nos **dois** lados (SSR real + preview no editor) → o preview é fiel byte-a-byte.

## Decisões-chave (para não reabrir)
1. **URLs das páginas novas: `/p/<slug>`** (nunca colide com os `.html` estáticos). Campo `custom_path` reservado para futuro "URL bonito" sem migrar.
2. **Fase 1 = só páginas novas.** Migração de páginas existentes só caso-a-caso, quando o cliente pedir redesign.
3. **Não reconstruir páginas de marketing à medida em blocos.** Gestão unificada ≠ reconstrução.

## ⚠️ Riscos / pendentes a olhar
- **SEGURANÇA:** repo é **público** e `schema.sql:126` tem a password admin em **plaintext** (`admin@smithandadams.com`). Rodar a password no Supabase, remover do SQL, e idealmente tornar o repo privado / limpar história. **Prioritário.**
- **Editor "Site pages" cobre 6 prefixos** (`index. about. propmgmt. invest. dev. global.`). Ficam de fora `urban.` (6 campos), `terms.` (2), `privacy.` (2), `contact.` (1). Se quiseres editá-los no Studio, acrescentar entradas a `CONTENT_PAGES` em `studio.html`.
- **Consistência de login (em curso noutra sessão):** `admin.html` concatena `@smithandadams.com` ao username — rebenta se meterem o email completo. Task de fix `fix-admin-login-email` foi lançada em sessão separada.
- **`admin-v2.html` / `admin-v3.html`** continuam no repo — candidatos a apagar depois de confirmar que nada os referencia.
- **Backoffices antigos** (`admin.html`, `admin-real-estate.html`) continuam a funcionar e ligados no Studio como "EXT ↗" (Real Estate, Blog). Consolidar nativamente é trabalho futuro (não urgente).

## Como testar rápido
1. `/studio.html` → login `admin@smithandadams.com`.
2. **Pages** → New page → adicionar blocos → **Preview** → **Publish**. Confirmar em `/p/<slug>`.
3. Marcar `show_in_nav` no inspector + publicar → a página aparece sozinha no menu do site (via `cms-loader.js`).
4. **Site pages** → escolher página → editar campos EN/PT → Save → confirmar no site (o `cms-loader` lê `site_content`).

## Próximos passos sugeridos (por prioridade)
1. Rodar password admin + fechar exposição do repo (**segurança**).
2. Secção **Media** nativa (biblioteca partilhada do bucket `site-media`).
3. Secção **Navigation** nativa (reordenar menu, toggles de `show_in_nav` sem entrar em cada página).
4. Consolidar Blog e Real Estate nativamente no Studio (hoje são EXT ↗).
5. Migração caso-a-caso de páginas simples para blocos, a pedido.
