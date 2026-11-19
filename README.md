# Beats Ao

Plataforma de beats. Este repositório está a ser reorganizado por camadas para separar apresentação, lógica do navegador, documentação e backend.

## Estrutura atual

```text
.
├── index.html                 # Documento de entrada do site
├── 404.html                   # Template HTML usado pelas Pages Functions
├── assets/
│   ├── css/
│   │   └── main.css           # Estilos atualmente extraídos do HTML
│   └── js/
│       └── app.js             # Lógica atualmente extraída do HTML
├── functions/
│   ├── beats/[slug].js         # Rota dinâmica de detalhe no Cloudflare
│   └── sitemap.xml.js          # Sitemap dinâmico
├── _routes.json                # Limita as rotas que invocam Functions
├── scripts/
│   └── generate-beat-pages.mjs # Exportação estática opcional por slug
├── docs/
│   ├── BUILD-PAGINAS-ESTATICAS.md
│   └── PLANO-IMPLEMENTACAO.md # Requisitos, riscos e fases de trabalho
├── supabase/
│   └── README.md              # Organização prevista para funções e migrações
├── CNAME                      # Domínio personalizado (manter na raiz)
├── sitemap.xml                # Sitemap público (manter na raiz)
├── googlebf9468f7f5a4a305.html# Verificação Google (manter na raiz)
└── ficheiros de imagem legados # Mantidos na raiz temporariamente por compatibilidade
```

## Onde alterar cada parte

- Estrutura e conteúdo HTML: `index.html`.
- Aparência e estilos: `assets/css/main.css`.
- Comportamento do catálogo: `assets/js/app.js`.
- Página individual: `functions/beats/[slug].js`, `assets/js/features/beat-detail-page.js` e `assets/css/beat-detail.css`.
- Sitemap dinâmico: `functions/sitemap.xml.js`.
- Rotas Cloudflare Pages: `_routes.json`.
- Geração de páginas estáticas: `node scripts/generate-beat-pages.mjs`.
- Requisitos e decisões técnicas: `docs/`.
- Funções Edge e migrações SQL: `supabase/` (a organizar e versionar após validação).

## Publicação

O site é alojado no Cloudflare Pages; o GitHub mantém o código-fonte. O diretório `functions/` contém as rotas dinâmicas Cloudflare Pages Functions e `_routes.json` limita a sua invocação. `index.html`, `CNAME`, `sitemap.xml`, `404.html` e o ficheiro de verificação Google permanecem no diretório de publicação. A publicação deve continuar pelo fluxo atual do Cloudflare Pages, não por GitHub Pages.

## Regras para contribuições

1. Não colocar chaves secretas, tokens, palavras-passe ou ficheiros `.env` no Git.
2. Não colocar a chave `service_role` ou qualquer secret no frontend.
3. Não publicar alterações diretamente em `main` sem revisão.
4. Criar migrações SQL pequenas, versionadas e com estratégia de reversão.
5. Preservar URLs de imagens e recursos existentes até concluir a migração de assets.
6. Testar a página, filtros, leitor, carrinho, avaliações e downloads em preview antes de publicar.

## Estado da reorganização

A extração inicial do CSS/JavaScript, módulos básicos, players e primeira versão das páginas individuais foi feita na branch `hardening/admin-foundation`. As rotas dinâmicas Cloudflare Pages estão preparadas e devolvem HTML pré-renderizado; dependem da publicação da API nova no Supabase e de um deployment de preview do projeto Pages para validação real.
