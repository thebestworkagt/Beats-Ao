# Páginas individuais de beats — Cloudflare Pages

## Arquitetura de publicação

O site é alojado no **Cloudflare Pages**. O GitHub é a origem/versionamento do código, não o servidor que responde ao público.

A página individual é resolvida por uma Cloudflare Pages Function:

- `functions/beats/[slug].js` → rota dinâmica `/beats/:slug`.
- `functions/sitemap.xml.js` → rota dinâmica `/sitemap.xml`.
- `_routes.json` → limita a invocação das Functions a `/beats/*` e `/sitemap.xml`.
- `404.html` → template HTML reutilizado pela Function, não é a solução de routing.
- `assets/js/features/beat-detail-page.js` → hidrata o conteúdo pré-renderizado e liga player, carrinho, avaliações, downloads e beats relacionados.
- `assets/css/beat-detail.css` → estilo da página de detalhe.

Cloudflare Pages utiliza routing baseado nos ficheiros dentro de `functions/`; os segmentos dinâmicos são disponibilizados em `context.params`. A Function usa `context.env.ASSETS.fetch()` para carregar o template estático. Referências: [routing](https://developers.cloudflare.com/pages/functions/routing/), [API reference](https://developers.cloudflare.com/pages/functions/api-reference/) e [bindings](https://developers.cloudflare.com/pages/functions/advanced-mode/).

## Fluxo de um pedido

1. O visitante abre `https://beatsao.site/beats/<slug>/`.
2. A Function valida o slug.
3. A Function consulta `GET /beat/:slug` na Edge Function Supabase.
4. Se o beat estiver publicado, a Function injeta os dados públicos no HTML, cria canonical, Open Graph e JSON-LD e devolve HTTP 200.
5. Se o beat não existir ou não estiver publicado, devolve página própria com HTTP 404 e `noindex`.
6. O browser hidrata a página com o JSON público embutido e carrega ratings/relacionados quando necessário.

Os dados embutidos no HTML vêm da allowlist da API pública; passwords, URLs e caminhos privados de download não devem chegar à página.

## Conteúdo da página

- Capa, título, artista, descrição e preço.
- Género, BPM e tonalidade.
- Player para o URL público de preview.
- MP3/WAV apenas quando o backend confirma disponibilidade.
- Avaliações, resumo e termos de licença.
- Adicionar ao carrinho, partilha e negociação.
- Beats relacionados.

## Configuração do Cloudflare Pages

- Manter a pasta `functions/` na raiz do projeto Pages.
- Garantir que o diretório de saída publicado contém `_routes.json`.
- O `_routes.json` atual inclui apenas `/beats/*` e `/sitemap.xml`; assets, catálogo e restantes páginas continuam a ser servidos como ficheiros estáticos sem invocar estas Functions.
- A publicação de Pages Functions é suportada por integração Git ou Wrangler; o upload direto pela interface do dashboard não suporta Functions. Referência: [Get started](https://developers.cloudflare.com/pages/functions/get-started/).
- Não é necessário mudar para GitHub Actions.
- Opcionalmente, definir as variáveis Pages `BEATS_API_BASE_URL` e `BEATS_SITE_ORIGIN`; a Function tem valores por omissão para o projeto e domínio atuais.

## Dependências de backend

A rota depende da versão candidata de `supabase/functions/api/index.ts`, que acrescenta `GET /beat/:slug` e usa a allowlist. Essa função ainda não está publicada e as migrações ainda não foram aplicadas. Até isso acontecer, a Function do Cloudflare não poderá apresentar os dados reais do catálogo.

## Segurança

- O HTML recebe apenas os campos da resposta pública.
- Os caminhos privados MP3/WAV não são incluídos no HTML.
- A Function não contém a chave secreta do Supabase.
- A autorização do download continua a ser validada pela Edge Function Supabase.
- O URL de preview é validado no browser antes de ser atribuído ao elemento de áudio.

## Validação já realizada

- Sintaxe JavaScript da Function, do controlador e do frontend.
- Teste simulado da Function: HTTP 200 em beat existente e HTTP 404 em slug inexistente.
- Conteúdo pré-renderizado e metadados canonical/JSON-LD.
- Texto com HTML malicioso é escapado.
- JSON embutido não contém password nem caminhos privados.
- Sitemap dinâmico inclui slugs válidos.

## Validação pendente antes da produção

1. Confirmar que o Cloudflare Pages está ligado ao repositório e que a pasta de saída inclui `_routes.json`.
2. Publicar primeiro a API candidata e aplicar/testar as migrações necessárias no Supabase, em ambiente de teste.
3. Fazer um deployment de preview do Cloudflare Pages e testar URL direto, refresh, HTTP 200, 404, preview, partilha e download.
4. Confirmar que o sitemap de produção inclui todos os beats publicados.
5. Só depois promover a versão testada para produção.
