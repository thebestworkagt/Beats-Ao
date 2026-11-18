# Beats Ao

Plataforma de beats. Este repositório está a ser reorganizado por camadas para separar apresentação, lógica do navegador, documentação e backend.

## Estrutura atual

```text
.
├── index.html                 # Documento de entrada do site
├── assets/
│   ├── css/
│   │   └── main.css           # Estilos atualmente extraídos do HTML
│   └── js/
│       └── app.js             # Lógica atualmente extraída do HTML
├── docs/
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
- Comportamento do frontend: `assets/js/app.js`.
- Requisitos e decisões técnicas: `docs/`.
- Funções Edge e migrações SQL: `supabase/` (a organizar e versionar após validação).

## Publicação

O site atual é publicado a partir da raiz do repositório. Por isso, `index.html`, `CNAME`, `sitemap.xml` e o ficheiro de verificação Google permanecem na raiz. Não alterar a pasta de publicação nem mover estes ficheiros sem atualizar e testar a configuração do alojamento.

## Regras para contribuições

1. Não colocar chaves secretas, tokens, palavras-passe ou ficheiros `.env` no Git.
2. Não colocar a chave `service_role` ou qualquer secret no frontend.
3. Não publicar alterações diretamente em `main` sem revisão.
4. Criar migrações SQL pequenas, versionadas e com estratégia de reversão.
5. Preservar URLs de imagens e recursos existentes até concluir a migração de assets.
6. Testar a página, filtros, leitor, carrinho, avaliações e downloads em preview antes de publicar.

## Estado da reorganização

A extração inicial do CSS e do JavaScript foi feita numa branch de desenvolvimento. A refatoração funcional do código continua pendente; esta primeira etapa apenas separa ficheiros sem redesenhar nem reescrever a aplicação.
