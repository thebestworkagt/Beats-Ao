# URLs e páginas individuais dos beats

## Contrato de URL

Cada beat publicado usa o slug persistido em `public.beats.slug`:

`https://beatsao.site/beats/<slug>/`

O frontend não inventa o slug a partir do título. Slugs devem ser únicos, minúsculos e conter apenas letras, números e hífen.

## Implementação preparada nesta branch

- `404.html`: fallback visual para pedidos de páginas de beat que não existam fisicamente no GitHub Pages.
- `assets/css/beat-detail.css`: estilos responsivos da página individual.
- `assets/js/features/beat-detail-page.js`: carrega `GET /beat/:slug`, apresenta detalhes e integra preview, carrinho, avaliações, partilha, downloads e beats relacionados.
- `app.js`: os cards incluem o acesso "Ver detalhes"; a partilha usa a URL canónica do beat.
- `scripts/generate-beat-pages.mjs`: gera ficheiros estáticos `dist/beats/<slug>/index.html` para cada beat publicado, atualiza metadados Open Graph, JSON-LD e sitemap.
- `assets/css/main.css`: estilo do novo link nos cards.

## Limite do fallback GitHub Pages

O `404.html` permite que o navegador mostre a página de detalhes mantendo o URL `/beats/<slug>/`, mas o pedido original continua a ser uma resposta HTTP 404. É um fallback de compatibilidade, não routing real com HTTP 200 e não deve ser tratado como solução final de SEO. A documentação GitHub Pages descreve este ficheiro como página personalizada de erro 404: [Custom 404 page](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).

## Publicação adequada para SEO

O gerador estático cria uma pasta `index.html` por slug. Quando o diretório `dist` for publicado como artefacto do GitHub Pages, cada rota existente passa a ser um ficheiro estático próprio com HTTP 200, título, description, canonical, Open Graph e JSON-LD preparados no build.

O gerador está pronto, mas ainda não existe um workflow de publicação por GitHub Actions nesta branch. A mudança da origem de publicação em Settings → Pages → Build and deployment → Source para GitHub Actions tem de ser planeada e testada antes de substituir a publicação atual por branch. O GitHub documenta esse modo de publicação aqui: [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Dependências de backend

O detalhe usa a rota `GET /beat/:slug` da Edge Function candidata. A API ainda não foi publicada e as migrações Supabase ainda não foram aplicadas; por isso, a página não estará operacional em produção até essa etapa.

As respostas públicas devem seguir a allowlist em `docs/API-PUBLICA-BEATS.md`. O frontend não recebe passwords, tokens, caminhos privados ou URLs de downloads.

## Conteúdo da página

- Capa, título, artista e descrição.
- Género, BPM e tonalidade.
- Player de preview.
- Preço.
- MP3/WAV apenas quando o backend confirma disponibilidade.
- Avaliações.
- Resumo e termos de licença.
- Negociação e adicionar ao carrinho.
- Beats relacionados.

## Regras funcionais

- Cada card tem uma ligação para a página do respetivo beat, se o slug for válido.
- A partilha copia o URL individual, não o antigo parâmetro `?beat=`.
- Beats não publicados são tratados como não encontrados pelo backend.
- Editar título não altera automaticamente o slug.
- Alterar slug exige redirecionamento do endereço anterior ou manutenção de aliases.
- Um URL assinado de download tem validade limitada; não é uma licença nem prova de compra.

## Validação pendente

As verificações realizadas nesta branch são estáticas: sintaxe JavaScript, correspondência de IDs no HTML, ordem de scripts e presença das referências aos endpoints. Ainda falta:
1. Publicar as migrações e a Edge Function num ambiente de teste.
2. Testar uma página com um beat real e confirmar player, ratings, carrinho, MP3/WAV e beats relacionados.
3. Executar o gerador com a API real e rever o `dist`.
4. Preparar e testar o workflow de publicação GitHub Pages com a origem Actions, sem interromper a produção.
