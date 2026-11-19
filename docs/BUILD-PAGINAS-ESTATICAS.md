# Geração de páginas estáticas por beat

## Comando

Com Node.js 18 ou superior, executar na raiz do repositório:

```bash
node scripts/generate-beat-pages.mjs
```

O comando consulta `GET /beats` na Edge Function pública e gera o site em `dist/`.

## Saída

- Copia os ficheiros necessários do site, `assets/`, domínio e verificação Google.
- Gera `dist/beats/<slug>/index.html` para cada beat publicado recebido da API.
- Pré-renderiza título, artista, género, BPM, tonalidade, preço, descrição e licença no HTML.
- Injeta title, description, canonical, Open Graph e JSON-LD.
- Apresenta os formatos MP3/WAV no HTML apenas quando `available_formats` os confirma.
- Acrescenta as URLs individuais ao `sitemap.xml`.
- Escapa conteúdo textual e não copia passwords, tokens, caminhos privados ou URLs de download para o HTML.
- A página inicial contém o conteúdo já renderizado; o JavaScript atualiza dados de áudio, avaliações e disponibilidade em tempo real.
- Falha se a API não responder com sucesso ou se existirem slugs duplicados.

## Variáveis opcionais

- `BEATS_API_BASE_URL`: endereço base da Edge Function. Por omissão usa o endpoint do projeto Beats Ao.
- `BEATS_SITE_ORIGIN`: origem canónica do site. Por omissão `https://beatsao.site`.
- `DIST_DIR`: diretório de saída. Por omissão `dist`; tem de ficar dentro do repositório e não pode ser a raiz.

## Pré-requisitos

1. A API nova deve estar publicada e `GET /beats` deve filtrar apenas beats publicados.
2. As migrações necessárias devem estar aplicadas.
3. A API tem de devolver os campos públicos esperados, especialmente `slug`, `title`, `artist`, `description`, `license_summary` e `cover`.
4. A API tem de continuar a omitir passwords e caminhos/URLs privados.

## Publicação

O diretório `dist` contém a versão pronta a publicar. Para obter páginas com HTTP 200 em URLs diretos, configurar GitHub Pages para publicar por GitHub Actions e adicionar um workflow que execute o gerador e publique `dist`.

**Esse workflow e a mudança das definições GitHub Pages ainda não foram executados ou configurados.** O site atual continua na origem de publicação existente. Enquanto isso, o `404.html` funciona como fallback de navegação, mas conserva o estado HTTP 404 do pedido.
