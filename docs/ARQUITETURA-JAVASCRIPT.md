# Arquitetura do JavaScript — Beats Ao

## Estado atual

O frontend é carregado por `assets/js/app.js`. O ficheiro contém uma IIFE única, 39 funções e estado lexical partilhado. Não há ainda módulos independentes nem uma camada formal de serviços.

A extração direta de funções para ficheiros separados não é segura: várias funções dependem de variáveis e funções declaradas dentro da mesma IIFE. A separação deve preservar essas dependências ou substituí-las deliberadamente por interfaces explícitas.

## Inventário por responsabilidade

| Área | Funções atuais | Dependências principais |
|---|---|---|
| Notificações | `showToast`, `removeToast`, `showShareToast` | DOM de toast e share |
| Perfil / privacidade | `toggleEmailVisibility`, `loadEmailVisibility` | `currentUser`, `emailVisible`, `emailText`, localStorage |
| Playlist | `getPlaylist`, `savePlaylist`, `togglePlaylist`, `isInPlaylist`, `updatePlaylistCount`, `openPlaylistModal` | `beatsData`, estado do áudio, DOM |
| Carrinho | `updateCart`, `toggleCart`, `getCartBeats`, `getCartTotal`, `openCartModal` | `cart`, `beatsData`, localStorage |
| Avaliações | `loadRatings`, `rateBeat`, `getBeatAverageRating`, `getBeatRatingCount` | API, `userRatings`, `renderBeats`, toast |
| Partilha | `shareBeat`, `fallbackCopy` | Clipboard, DOM, toast |
| Tema | `toggleTheme`, `loadTheme` | DOM, localStorage |
| API / catálogo | `loadBeats`, `incrementPlays`, `updateBeatPlaysDisplay` | API, `beatsData`, ratings, filtros |
| Pesquisa / ordenação | `applyFilters` | `beatsData`, `filteredBeats`, ratings, DOM |
| Renderização | `renderBeats`, `createBeatCard`, `updateUI`, `updatePlaylistButtons` | Quase todo o estado do catálogo, player, carrinho e modais |
| Formulário / edição | `openFormModal`, `closeFormModal`, `openEditModal` | `editingId`, `selectedCoverFile`, catálogo e DOM |
| Download | `openPasswordModal` | Beat selecionado, formato, API e modal |
| Dashboard | `openDashboard` | Beats, ratings e DOM |
| Autenticação / administração | `doLogin`, `doLogout`, `deleteBeat` | Estado de sessão e interface; atualmente desativadas |
| Inicialização | `init` | Tema, catálogo, interface e API |
| Eventos | bloco de registo de listeners dentro da IIFE | Todas as áreas anteriores |

## Estado partilhado atual

- Catálogo: `beatsData`, `filteredBeats`
- Administração: `editMode`, `editingId`, `isLoggedIn`, `currentUser`
- Formulário: `selectedCoverFile`
- Reprodução: `playlistAudio`, `playlistAudioId`, `currentBeatId`
- Download: `selectedFormat`
- Carrinho e avaliações: `cart`, `userRatings`
- Perfil: `emailVisible`, `emailText`

## Módulos já extraídos

A primeira fase de modularização já foi aplicada no branch de desenvolvimento:

- `assets/js/services/api.js`: serviço HTTP comum para a Edge Function.
- `assets/js/features/theme.js`: aplicação e alternância do tema.
- `assets/js/core/notifications.js`: notificações toast e feedback de partilha.
- `assets/js/features/profile-privacy.js`: visibilidade e ocultação do email do perfil.
- `assets/js/features/playlist.js`: persistência e operações básicas da playlist.
- `assets/js/app.js`: ainda mantém catálogo, reprodução, carrinho, avaliações, modais, eventos e inicialização.

Os módulos são carregados antes de `app.js`, através de scripts clássicos com `defer`. A comunicação entre módulos é feita por interfaces explícitas em `window.BeatsAo...`; não foi introduzido bundler nem framework.

## Estrutura-alvo proposta

A divisão será gradual, mantendo inicialmente o carregamento clássico e sem introduzir ferramentas de build:

```text
assets/js/
  app.js                 # ponto de entrada e inicialização
  config/
    constants.js         # URL e constantes não secretas
  core/
    state.js             # estado central temporário
    dom.js               # consultas DOM e utilitários comuns
    notifications.js     # toast e feedback
  services/
    api.js               # chamadas HTTP à Edge Function
  features/
    catalog.js           # carregamento, pesquisa, filtros e renderização
    player.js            # reprodução e contador de plays
    playlist.js          # favoritos e modal da playlist
    cart.js              # carrinho e total
    ratings.js           # leitura e envio de avaliações
    downloads.js         # seleção de formato e pedido de download
    profile.js           # perfil e privacidade do email
    theme.js             # tema claro/escuro
    dashboard.js         # estatísticas
    admin.js             # autenticação e operações administrativas
  events/
    bindings.js          # registo central dos eventos da interface
```

Esta é uma estrutura-alvo, não uma declaração de que os módulos já existem. A implementação deverá definir contratos explícitos entre módulos e remover gradualmente o estado global implícito.

## Ordem de migração

1. Criar uma camada de API e centralizar tratamento de erros sem alterar endpoints.
2. Isolar estado e utilitários comuns.
3. Extrair tema, notificações e perfil, que têm dependências relativamente delimitadas.
4. Extrair playlist e carrinho.
5. Extrair avaliações e downloads.
6. Separar player e catálogo, preservando o ciclo de renderização.
7. Isolar eventos e inicialização.
8. Só depois reavaliar a área administrativa, que atualmente está desativada e depende de segurança no backend.

## Regras de segurança e compatibilidade

- Não colocar chaves secretas do Supabase no frontend.
- Não considerar ocultar botões ou menus como autorização.
- Não expor passwords nem links privados na resposta pública de catálogo.
- Não confiar em preço, identidade, pagamento ou formato enviados pelo browser.
- Preservar os IDs usados pelo HTML até que os eventos sejam migrados e testados.
- Não alterar a branch `main` nem publicar automaticamente.
- Cada etapa deve ser validada antes de avançar para a seguinte.

## Validação pendente

A inspeção realizada foi estática, através do código no GitHub. Ainda não houve teste de browser, execução automatizada, nem chamadas de teste à API. Portanto, não se declara a aplicação funcional apenas com base nesta reorganização.


### Carrinho
- Arquivo: `assets/js/features/cart.js`.
- Responsabilidade: persistência do carrinho, inclusão/remoção de beats, consulta dos itens, cálculo do total e atualização do contador.
- API global: `window.BeatsAoCart`.
- O `app.js` mantém apenas a integração com a interface, catálogo e checkout; não manipula diretamente o estado persistido do carrinho.
