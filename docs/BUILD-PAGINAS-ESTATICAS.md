# Exportação estática opcional das páginas de beats

A publicação principal usa Cloudflare Pages Functions em `functions/beats/[slug].js` e não depende deste gerador. Este script fica como alternativa para exportar um snapshot estático do catálogo, por exemplo para arquivo, testes offline ou outro alojamento.

## Comando

Com Node.js 18 ou superior, executar na raiz do repositório:

```bash
node scripts/generate-beat-pages.mjs
```

O comando consulta `GET /beats` na Edge Function pública e gera o site em `dist/`.

## Saída

- Copia o shell estático, os assets e os ficheiros públicos necessários.
- Gera `dist/beats/<slug>/index.html` para cada beat publicado.
- Pré-renderiza título, artista, género, BPM, tonalidade, preço, descrição e licença.
- Injeta canonical, Open Graph e JSON-LD.
- Acrescenta as URLs individuais ao sitemap.
- Escapa conteúdo textual e não copia passwords, tokens, caminhos privados ou URLs de download.
- Falha se a API não responder com sucesso ou se existirem slugs duplicados.

## Variáveis opcionais

- `BEATS_API_BASE_URL`: endereço base da Edge Function.
- `BEATS_SITE_ORIGIN`: origem canónica do site.
- `DIST_DIR`: diretório de saída; por omissão `dist`.

## Nota de publicação

Para o alojamento atual, usar Cloudflare Pages Functions. Não mudar a origem de publicação para GitHub Actions. O ficheiro `_routes.json` tem de estar no diretório de saída usado por Pages; a pasta `functions/` deve permanecer na raiz do projeto Pages.
