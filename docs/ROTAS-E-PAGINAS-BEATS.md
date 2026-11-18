# URLs e páginas individuais dos beats

## Objetivo

Cada beat publicado deverá ter uma página própria, partilhável e indexável, com URL canónico no formato:

`https://beatsao.site/beats/<slug>/`

Exemplo ilustrativo: `/beats/noite-de-verao/`. O slug real deverá vir do campo único `beats.slug`; não deve ser recriado de forma diferente no frontend.

## Conteúdo esperado da página

- Capa, título, artista e descrição.
- Género, BPM e tonalidade.
- Player de preview.
- Preço e estado de disponibilidade.
- Opções MP3/WAV apenas quando cada formato estiver realmente disponível.
- Avaliações e beats relacionados.
- Condições de licença e chamada para compra.
- Metadados SEO: title, description, canonical e Open Graph.

## Decisão técnica: alojamento estático

O site atual é publicado no GitHub Pages. Esse alojamento não executa código de servidor para resolver dinamicamente qualquer slug. Criar apenas um link para `/beats/<slug>/` não garante que o GitHub Pages encontre a página.

As opções são:

1. **Páginas estáticas geradas por beat** — melhor para SEO e partilha. Um processo de build cria `beats/<slug>/index.html` para cada beat publicado. Exige uma fonte pública de dados segura e um processo de atualização quando o catálogo muda.
2. **Fallback SPA/404** — mantém o URL solicitado e deixa o JavaScript resolver o slug. É uma solução de transição, mas pode devolver estado HTTP 404 e prejudicar indexação/partilha por crawlers.
3. **Alojamento com routing no servidor/edge** — Cloudflare Pages Functions ou Worker pode resolver `/beats/:slug` e devolver a página correta. Exige preparar e validar a migração do alojamento e DNS.

## Recomendação

Não implementar a rota definitiva antes de corrigir o endpoint público do catálogo. Atualmente, a Edge Function descrita no projeto usa `select('*')` em `beats`, o que pode expor campos que nunca devem sair para visitantes, incluindo password e links de download protegidos.

A sequência segura é:

1. Criar uma resposta pública de catálogo com allowlist explícita de campos.
2. Garantir que o slug é único, estável e validado no backend.
3. Escolher entre geração estática e routing Cloudflare. Para SEO completo, preferir páginas estáticas geradas ou uma resposta HTML renderizada no edge.
4. Implementar página de detalhe e URLs canónicos.
5. Atualizar os cards para abrir a página do respetivo beat.
6. Testar URL direto, refresh, navegação, partilha, beat inexistente e beat não publicado.

## Regras funcionais

- Cada card abre a página do seu próprio beat.
- O URL é derivado do slug persistido, nunca do título em tempo real.
- Beats sem slug válido não devem receber URL improvisado; devem ser corrigidos no catálogo.
- Beats não publicados não podem ser expostos por URL direto.
- Editar título não altera automaticamente o slug existente.
- Alterar slug exige redirecionamento do endereço anterior ou manutenção de aliases.
- A página pública nunca recebe password, credenciais, tokens nem URLs privados de download.
- Os botões MP3 e WAV só aparecem quando o backend confirma que o formato está disponível; o backend continua a validar cada pedido.

## Estado

Este documento define o contrato e as dependências. As páginas e rotas ainda não foram implementadas. A branch principal não foi alterada.
