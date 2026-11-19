# Arquitetura JavaScript — Beats Ao

## Estado atual da branch

O frontend usa scripts clássicos com `defer`, sem bundler ou framework. Os módulos comunicam-se por interfaces explícitas em `window.BeatsAo...`. A branch de trabalho é `hardening/admin-foundation`; a branch `main` permanece separada.

## Estrutura existente

```text
assets/js/
  app.js
  core/
    notifications.js
  features/
    beat-detail-page.js
    cart.js
    card-player.js
    playlist-player.js
    playlist.js
    profile-privacy.js
    ratings.js
    theme.js
  services/
    api.js
```

## Módulos extraídos e responsabilidades

| Ficheiro | Responsabilidade | Interface |
|---|---|---|
| `services/api.js` | GET/POST para a Edge Function | `window.BeatsAoApi` |
| `core/notifications.js` | Toasts e feedback de partilha | `window.BeatsAoNotifications` |
| `features/theme.js` | Carregar e alternar tema | `window.BeatsAoTheme` |
| `features/profile-privacy.js` | Privacidade do email do perfil | `window.BeatsAoProfilePrivacy` |
| `features/playlist.js` | Persistência e operações da playlist | `window.BeatsAoPlaylist` |
| `features/playlist-player.js` | Reprodução, pausa, progresso e limpeza do áudio da playlist | `window.BeatsAoPlaylistPlayer` |
| `features/card-player.js` | Player independente por card: reprodução, pausa, reinício, seek e volume | `window.BeatsAoCardPlayer` |
| `features/cart.js` | Persistência, inclusão, remoção, total e contador do carrinho | `window.BeatsAoCart` |
| `features/ratings.js` | Carregar, submeter e calcular avaliações | `window.BeatsAoRatings` |

Os módulos são carregados antes de `app.js` em `index.html`. O ficheiro principal já delega as operações básicas destas áreas aos respetivos módulos, mas continua responsável pela ligação à interface e por várias regras de apresentação.

## Página individual e Cloudflare Pages

- `functions/beats/[slug].js` resolve `/beats/:slug`, consulta a API Supabase e devolve HTML pré-renderizado com HTTP 200.
- `functions/sitemap.xml.js` constrói `/sitemap.xml` a partir do catálogo público.
- `_routes.json` limita as invocações das Functions a `/beats/*` e `/sitemap.xml`; o catálogo e os assets permanecem estáticos.
- `docs/CONFIGURACAO-CLOUDFLARE-PAGES.md` documenta como testar a branch num deployment preview sem alterar produção.
- `404.html` é o template HTML que a Function transforma, não o mecanismo de routing.
- `features/beat-detail-page.js` hidrata os dados públicos embutidos no HTML e liga preview, download, avaliação, carrinho, partilha e relacionados.
- `scripts/generate-beat-pages.mjs` permanece como ferramenta opcional de exportação estática; não é exigido pela rota Cloudflare.
- O link de detalhe e a partilha no `app.js` usam `/beats/<slug>/`.

## Responsabilidades ainda concentradas em app.js

- Catálogo: carregamento, pesquisa, filtros e renderização dos cards.
- Player dos cards: agora usa `features/card-player.js`; o módulo associa eventos e controla o áudio individual, enquanto `app.js` fornece os elementos DOM e o callback de contagem.
- Player da playlist: agora usa `features/playlist-player.js`, que gere o objeto `Audio` partilhado, progresso, tempo e limpeza ao parar.
- Modais de carrinho e playlist.
- Integração visual das avaliações.
- Downloads, autenticação atualmente desativada, formulário e eventos.
- Inicialização e estado partilhado.

### Atenção ao player

Existem dois contextos distintos de reprodução: o áudio individual de cada card e o áudio da playlist. A extração deve impedir reprodução simultânea não intencional, manter os botões sincronizados e limpar listeners/estado ao fechar ou reconstruir a playlist. Não fundir os dois contextos sem testes.

## Ordem de trabalho proposta

1. Validar módulos já extraídos no navegador e corrigir inconsistências documentais.
2. Testar os dois módulos de áudio no navegador, incluindo erros de carregamento, troca de card e encerramento.
3. Definir o contrato de dados e a rota de detalhe individual de cada beat. (Preparado.)
4. Implementar páginas de beat com URL amigável e carregamento por slug. (Primeira versão implementada.)
5. Redesenhar os cards e a página individual com base no contrato definitivo.
6. Separar catálogo, downloads e área administrativa.
7. Automatizar testes e só depois avaliar integração na branch principal.

## Segurança e compatibilidade

- Nunca colocar chaves secretas do Supabase no frontend.
- Não expor passwords nem links privados na resposta pública do catálogo.
- Não confiar em preço, identidade, pagamento ou formato enviados pelo browser.
- Ocultar um botão não substitui autorização no backend.
- Preservar IDs e seletores existentes até os eventos correspondentes serem migrados.
- Não publicar alterações desta branch automaticamente.

## Validação pendente

As verificações incluíram sintaxe das Pages Functions, correspondência dos IDs entre HTML e JavaScript, teste simulado do endpoint de detalhe (HTTP 200 e 404), pré-renderização com dados de teste contendo HTML malicioso, dados embutidos sem campos privados e geração do sitemap. Ainda falta um deployment de preview no Cloudflare Pages e teste contra a Edge Function Supabase publicada. Não declarar a aplicação integralmente funcional até executar esses testes.
