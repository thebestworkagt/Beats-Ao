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

## Procedimentos

- `docs/MIGRACAO-STORAGE.md`: inventário somente de leitura, transferência dos downloads para o bucket privado e limpeza segura dos objetos públicos antigos.

## Migrações preparadas

- `migrations/20261119000000_add_beat_detail_fields.sql`: adiciona descrição, resumo/termos de licença e estado de publicação.
- `migrations/20261119010000_atomic_beat_plays.sql`: cria incremento atómico de reproduções para beats publicados e limita a RPC ao backend.
- `migrations/20261119030000_private_beat_downloads.sql`: cria o bucket privado `beat-downloads`, acrescenta colunas de caminhos de ficheiros e bloqueia acesso de browser ao novo bucket.

As três migrações automáticas ainda não foram aplicadas.

O endurecimento de grants foi separado para `manual/restrict_direct_table_access.sql`. O bloqueio de alterações dos clientes no bucket de previews está em `manual/lock_public_audios_writes.sql`. Estes scripts não são executados automaticamente pelo Supabase CLI.

## Ordem obrigatória de publicação

A ordem abaixo evita interromper a API antiga antes de a versão privilegiada estar ativa:

1. Fazer backup e testar numa instância de desenvolvimento.
2. Aplicar as três migrações automáticas em ordem: `20261119000000_add_beat_detail_fields.sql`, `20261119010000_atomic_beat_plays.sql` e `20261119030000_private_beat_downloads.sql`.
3. Copiar cada ficheiro comercial MP3/WAV para `beat-downloads`, usando `beats/<id>/mp3/<nome>.mp3` e `beats/<id>/wav/<nome>.wav`; preencher `download_mp3_path` e `download_wav_path` com caminhos relativos.
4. Antes de remover objetos antigos do bucket público `audios`, confirmar que cada preview continua a usar o URL antigo e que cada download foi copiado e testado no bucket privado. Só depois remover os antigos objetos comerciais.
5. Publicar `functions/api/index.ts`; confirmar que a função lê `SUPABASE_SECRET_KEYS` no runtime.
6. Testar `GET /beats`, `GET /beat/:slug`, `GET /ratings`, `POST /play`, `POST /rate` e `POST /download` num beat de teste. Confirmar que o link assinado expira e que não existe acesso anónimo ao bucket privado.
7. Depois de migrar os ficheiros comerciais, executar `manual/lock_public_audios_writes.sql` para bloquear INSERT/UPDATE/DELETE dos clientes no bucket `audios` sem impedir a leitura pública dos previews.
8. Só depois de a nova Edge Function estar publicada e testada, executar manualmente `manual/restrict_direct_table_access.sql`; testar que consultas diretas às tabelas falham com a chave pública e repetir os testes da API.
9. Publicar o frontend que lê `available_formats`; testar MP3, WAV e beat sem ficheiros disponíveis.

**Não aplicar o passo 8 antes do passo 5 e da validação do passo 6.** A revogação de grants foi separada das migrações automáticas para impedir que um `db push` a execute antes da nova API. O script do bucket `audios` mantém a leitura pública; não tornar o bucket inteiro privado sem separar primeiro os previews, pois a reprodução pode parar.

## Integração com Cloudflare Pages

O frontend é alojado no Cloudflare Pages. As rotas de apresentação por slug ficam em `functions/beats/[slug].js` e o sitemap dinâmico em `functions/sitemap.xml.js`. O Pages Function consulta a Edge Function Supabase por `GET /beat/:slug`; não recebe nem guarda a chave secreta do Supabase. O `_routes.json` limita a execução das Functions a `/beats/*` e `/sitemap.xml`.

## Edge Function versionada

O candidato Supabase está em `supabase/functions/api/index.ts`. Mantém os caminhos utilizados pelo frontend e acrescenta `GET /beat/:slug`. Usa `SUPABASE_SECRET_KEYS` (chave `default`) exclusivamente no servidor; não usa a chave pública para consultar colunas privadas. A configuração `config.toml` define `verify_jwt = false` porque o browser chama estas rotas públicas sem JWT; a própria função aplica validações e nunca devolve a chave.

**Ainda não foi publicado no Supabase.** Depende das migrações de campos, contador e Storage, da transferência dos ficheiros comerciais para o bucket privado e da validação em ambiente de teste. Não copiar para produção antes de rever os pontos pendentes abaixo.

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
- O URL assinado de 120 segundos não pode ser revogado individualmente após emissão; renomear, mover ou apagar o objeto invalida o caminho original, mas os links emitidos podem continuar funcionais até a expiração/cache.
- Não existe ainda autenticação administrativa nem CRUD de beats.
- CORS não é autenticação e não impede chamadas diretas fora do navegador.
- O script manual para revogar grants diretos está preparado, mas não aplicado; as policies RLS antigas permanecem e devem ser revistas após restringir os grants.
- O bucket `audios` continua público. O script `manual/lock_public_audios_writes.sql` limita alterações dos clientes, mas a leitura permanece pública; os downloads antigos continuam expostos até migração dos objetos e remoção dos ficheiros comerciais antigos. Não tornar o bucket privado antes do inventário.
- Até corrigir o Storage, não se deve tratar um URL de ficheiro como protegido só por não o devolver no catálogo.

Nunca guardar valores de secrets neste repositório. A chave secreta padrão é injetada no runtime Supabase através de `SUPABASE_SECRET_KEYS`; a função lê `default`. Consultar a documentação oficial de [Environment variables](https://supabase.com/docs/guides/functions/secrets).
