# Beats Ao

Plataforma de beats. Este repositório está a ser reorganizado por camadas para separar apresentação, lógica do navegador, documentação e backend.

## Estrutura atual

```text
.
├── index.html                 # Documento de entrada do site
├── 404.html                   # Fallback de rotas individuais em GitHub Pages
├── assets/
│   ├── css/
│   │   └── main.css           # Estilos atualmente extraídos do HTML
│   └── js/
│       └── app.js             # Lógica atualmente extraída do HTML
├── scripts/
│   └── generate-beat-pages.mjs # Gera páginas estáticas por slug
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
- Página individual: `assets/js/features/beat-detail-page.js` e `assets/css/beat-detail.css`.
- Geração de páginas estáticas: `node scripts/generate-beat-pages.mjs`.
- Requisitos e decisões técnicas: `docs/`.
- Funções Edge e migrações SQL: `supabase/` (a organizar e versionar após validação).

## Publicação

O site atual é publicado a partir da raiz do repositório. Por isso, `index.html`, `404.html`, `CNAME`, `sitemap.xml` e o ficheiro de verificação Google permanecem na raiz. Não alterar a pasta de publicação sem atualizar e testar a configuração do alojamento. O gerador estático prepara `dist/` com páginas individuais reais; a publicação desse artefacto por GitHub Actions ainda não foi configurada.

## Regras para contribuições

1. Não colocar chaves secretas, tokens, palavras-passe ou ficheiros `.env` no Git.
2. Não colocar a chave `service_role` ou qualquer secret no frontend.
3. Não publicar alterações diretamente em `main` sem revisão.
4. Criar migrações SQL pequenas, versionadas e com estratégia de reversão.
5. Preservar URLs de imagens e recursos existentes até concluir a migração de assets.
6. Testar a página, filtros, leitor, carrinho, avaliações e downloads em preview antes de publicar.

## Estado da reorganização

A extração inicial do CSS/JavaScript, módulos básicos, players e primeira versão das páginas individuais foi feita na branch `hardening/admin-foundation`. A página detalhada e o gerador estão preparados, mas dependem da API nova no Supabase e da configuração de publicação por GitHub Actions para produzir páginas HTTP 200.
