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
    cart.js
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
| `features/cart.js` | Persistência, inclusão, remoção, total e contador do carrinho | `window.BeatsAoCart` |
| `features/ratings.js` | Carregar, submeter e calcular avaliações | `window.BeatsAoRatings` |

Os módulos são carregados antes de `app.js` em `index.html`. O ficheiro principal já delega as operações básicas destas áreas aos respetivos módulos, mas continua responsável pela ligação à interface e por várias regras de apresentação.

## Responsabilidades ainda concentradas em app.js

- Catálogo: carregamento, pesquisa, filtros e renderização dos cards.
- Player dos cards: cada card cria e controla o seu próprio objeto `Audio`.
- Player da playlist: usa um objeto `Audio` partilhado, com progresso e tempo.
- Modais de carrinho e playlist.
- Integração visual das avaliações.
- Downloads, autenticação atualmente desativada, formulário e eventos.
- Inicialização e estado partilhado.

### Atenção ao player

Existem dois contextos distintos de reprodução: o áudio individual de cada card e o áudio da playlist. A extração deve impedir reprodução simultânea não intencional, manter os botões sincronizados e limpar listeners/estado ao fechar ou reconstruir a playlist. Não fundir os dois contextos sem testes.

## Ordem de trabalho proposta

1. Validar módulos já extraídos no navegador e corrigir inconsistências documentais.
2. Isolar o player da playlist, mantendo o player de cada card funcional.
3. Definir o contrato de dados e a rota de detalhe individual de cada beat.
4. Implementar páginas de beat com URL amigável e carregamento por slug.
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

As verificações até agora são sobretudo inspeções estáticas do repositório. Ainda não há evidência de testes completos no navegador nem de testes de integração contra a API. Não declarar a aplicação integralmente funcional até executar esses testes.
