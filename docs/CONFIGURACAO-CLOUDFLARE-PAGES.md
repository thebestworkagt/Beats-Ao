# Configuração de páginas e rotas no Cloudflare Pages

## Objetivo

Este repositório usa Cloudflare Pages para alojar o site e GitHub para versionar o código. As páginas individuais dependem de Cloudflare Pages Functions.

## Estrutura necessária

- `functions/beats/[slug].js`: responde a `/beats/<slug>/`.
- `functions/sitemap.xml.js`: responde a `/sitemap.xml`.
- `_routes.json`: define as rotas que invocam Functions.
- `404.html`: template HTML reutilizado pelas Functions.
- `assets/`: CSS e JavaScript do frontend.

O diretório `functions/` deve permanecer na raiz do projeto Pages. O ficheiro `_routes.json` deve existir no diretório de saída que o Cloudflare publica. O projeto está preparado para publicação com a raiz do repositório como diretório de saída; confirmar esta definição no dashboard antes de promover o deployment.

## Fluxo recomendado

1. Abrir Cloudflare Dashboard → Workers & Pages → projeto Beats Ao.
2. Em Settings → Builds & deployments, confirmar o repositório Git ligado e a branch de produção atualmente configurada.
3. Confirmar o build output directory. O ficheiro `_routes.json` tem de estar nesse diretório; se a saída publicada for a raiz do repositório, o ficheiro atual já está no local esperado.
4. Confirmar que a pasta `functions/` está na raiz do projeto Pages.
5. Criar um deployment de preview a partir da branch `hardening/admin-foundation`, sem alterar a branch de produção.
6. Confirmar que o preview executa as Pages Functions. Se o projeto tiver sido criado por Direct Upload, esse modo não suporta Pages Functions pelo dashboard; usar a integração Git ou Wrangler.
7. Só depois de a Edge Function Supabase estar publicada e testada, verificar:
   - `GET /beats/<slug>/` → HTTP 200 e HTML com title/canonical/Open Graph.
   - `GET /beats/slug-inexistente/` → HTTP 404 e `noindex`.
   - `GET /sitemap.xml` → XML com apenas beats publicados.
   - CSS, JavaScript, imagens e página inicial continuam a ser servidos como assets estáticos.
8. Rever logs das Functions e testar no browser (desktop e telemóvel). Só depois promover a alteração para produção.

## Variáveis opcionais

Em Settings → Variables and Secrets, para Production e Preview conforme necessário:

- `BEATS_API_BASE_URL`: endereço base da Edge Function Supabase. Por omissão, o código usa o endpoint atual do projeto.
- `BEATS_SITE_ORIGIN`: domínio canónico, por omissão `https://beatsao.site`.

Estas duas variáveis não são secrets. A Cloudflare Function não precisa de qualquer chave secreta do Supabase porque consulta apenas as rotas públicas da API.

## Rotas e consumo de Functions

O `_routes.json` atual limita a execução das Pages Functions a `/beats/*` e `/sitemap.xml`. O catálogo, a homepage, os ficheiros CSS/JS e as imagens não invocam Functions. Isto evita executar código de servidor em todos os pedidos estáticos.

Referências oficiais:
- [Cloudflare Pages — Get started](https://developers.cloudflare.com/pages/functions/get-started/)
- [Cloudflare Pages — Routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Cloudflare Pages — Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Pages — API reference](https://developers.cloudflare.com/pages/functions/api-reference/)

## Limites atuais

- A rota depende de `GET /beat/:slug` na nova Edge Function Supabase. Essa versão ainda não foi publicada.
- As migrações Supabase continuam por aplicar.
- Não foi possível verificar as definições reais do dashboard Cloudflare nem criar um deployment de preview a partir desta sessão.
- A branch `main` e o deployment de produção não foram alterados.
