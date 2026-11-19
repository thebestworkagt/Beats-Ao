# Supabase

Esta pasta contém a versão candidata e versionada do backend e as migrações SQL do projeto.

Estrutura prevista:

```text
supabase/
├── functions/
│   └── api/
│       └── index.ts
└── migrations/
    └── YYYYMMDDHHMMSS_descricao.sql
```

## Migrações preparadas

- `migrations/20261119000000_add_beat_detail_fields.sql`: adiciona descrição, resumo/termos de licença e estado de publicação.
- `migrations/20261119010000_atomic_beat_plays.sql`: cria incremento atómico de reproduções para beats publicados e limita a RPC ao backend.
- `migrations/20261119020000_restrict_direct_table_access.sql`: revoga o acesso direto de `anon` e `authenticated` às tabelas internas.
- `migrations/20261119030000_private_beat_downloads.sql`: cria o bucket privado `beat-downloads`, acrescenta colunas de caminhos de ficheiros e bloqueia acesso de browser ao novo bucket.

As quatro migrações ainda não foram aplicadas.

## Ordem obrigatória de publicação

A ordem abaixo evita interromper a API antiga antes de a versão privilegiada estar ativa:

1. Fazer backup e testar numa instância de desenvolvimento.
2. Aplicar `20261119000000_add_beat_detail_fields.sql` e `20261119010000_atomic_beat_plays.sql`.
3. Aplicar `20261119030000_private_beat_downloads.sql` para criar o bucket privado e as colunas de caminhos.
4. Copiar cada ficheiro comercial MP3/WAV para `beat-downloads`, usando `beats/<id>/mp3/<nome>.mp3` e `beats/<id>/wav/<nome>.wav`; preencher `download_mp3_path` e `download_wav_path` com caminhos relativos.
5. Antes de remover objetos antigos do bucket público `audios`, confirmar que cada preview ainda usa o URL antigo e que cada download foi copiado e testado no bucket privado. Só depois remover os antigos objetos comerciais.
6. Publicar `functions/api/index.ts`; confirmar que a função lê `SUPABASE_SECRET_KEYS` no runtime.
7. Testar `GET /beats`, `GET /beat/:slug`, `GET /ratings`, `POST /play`, `POST /rate` e `POST /download` num beat de teste. Confirmar que o link assinado expira e que não existe acesso anónimo ao bucket privado.
8. Só depois aplicar `20261119020000_restrict_direct_table_access.sql`, testar as consultas diretas com a chave pública e repetir os testes da Edge Function.
9. Publicar o frontend que lê `available_formats`; testar MP3, WAV e beat sem ficheiros disponíveis.

**Nunca executar o passo 8 antes do passo 6 e da validação do passo 7.** Caso contrário, a função antiga, que usa a chave pública, pode perder acesso às tabelas. Não tornar o bucket antigo `audios` privado sem separar primeiro os previews, pois a reprodução pública pode parar.

## Edge Function versionada

O candidato está em `functions/api/index.ts`. Mantém os caminhos utilizados pelo frontend e acrescenta `GET /beat/:slug`. Usa `SUPABASE_SECRET_KEYS` (chave `default`) exclusivamente no servidor; não usa a chave pública para consultar colunas privadas. A configuração `config.toml` define `verify_jwt = false` porque o browser chama estas rotas públicas sem JWT; a própria função aplica validações e nunca devolve a chave.

**Ainda não foi publicado no Supabase.** Depende das migrações de campos, contador e Storage e da validação em ambiente de teste. Não copiar para produção antes de rever os pontos pendentes abaixo.

### Melhorias incluídas

- `GET /beats` usa uma lista explícita de colunas e filtra apenas beats publicados.
- `GET /beat/:slug` devolve um único beat publicado.
- Os campos de password e URLs de download não são incluídos em respostas públicas.
- `available_formats` informa apenas se os caminhos MP3/WAV existem no bucket privado.
- `POST /download` gera um link assinado de 120 segundos no bucket privado `beat-downloads`; não devolve os antigos URLs públicos.
- `GET /ratings` devolve apenas `beat_id` e `rating`, nunca `user_id`.
- `POST /play` utiliza função SQL atómica.
- Validação básica de IDs, notas, formatos e tamanho do corpo.
- CORS limitado aos domínios configurados no código.

### Riscos que permanecem

- `POST /rate` continua anónimo e não tem limitação persistente de frequência; a identidade fornecida pelo browser não é aceite como prova de identidade.
- `POST /download` continua a comparar uma password guardada em texto simples. O ficheiro vem do bucket privado e recebe URL assinado por 120 segundos, mas isto continua a ser um controlo temporário, não prova de compra/licença.
- Os ficheiros antigos ainda existentes no bucket público `audios` continuam acessíveis pelos URLs antigos até serem copiados para o bucket privado e removidos do bucket público. A migração não copia nem apaga ficheiros.
- Não existe ainda autenticação administrativa nem CRUD de beats.
- CORS não é autenticação e não impede chamadas diretas fora do navegador.
- A migração para revogar grants diretos está preparada, mas não aplicada; as permissões RLS antigas permanecem no SQL e devem ser revistas após restringir os grants.
- O bucket `audios` continua público, com políticas antigas permissivas. É mantido assim para não quebrar previews; os downloads antigos continuam expostos até migração de objetos. Não remover nem tornar o bucket privado antes do inventário.
- Até corrigir o Storage, não se deve tratar um URL de ficheiro como protegido só por não o devolver no catálogo.

Nunca guardar valores de secrets neste repositório. A chave secreta padrão é injetada no runtime Supabase através de `SUPABASE_SECRET_KEYS`; a função lê `default`. Consultar a documentação oficial de [Environment variables](https://supabase.com/docs/guides/functions/secrets).
