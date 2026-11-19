# Contrato público do catálogo Beats Ao

## Objetivo

A interface pública e as páginas individuais devem receber somente os dados necessários à apresentação comercial do beat. A API pública não deve devolver o registo completo da tabela.

## Campos públicos permitidos

A resposta de catálogo/detalhe pode conter apenas:

- `id`
- `title`
- `artist`
- `genre`
- `price` (mantém-se texto nesta fase, compatível com a coluna atual)
- `bpm`
- `key`
- `cover`
- `audio` (apenas o áudio de preview que se destina a reprodução pública)
- `slug`
- `plays`
- `description`
- `license_summary`
- `license_terms` (quando efetivamente público e aplicável)
- `available_formats`, calculado no servidor, por exemplo `{ "mp3": true, "wav": false }`

A disponibilidade de formato é calculada no servidor a partir dos campos `download_mp3_path` e `download_wav_path` no bucket privado. Nunca devolver os próprios caminhos nem URLs de download.

## Campos que nunca devem integrar a resposta pública

- `password`
- `audio_download_mp3`
- `audio_download_wav`
- `user_id`
- chaves, tokens, credenciais, hashes ou dados internos de autorização

O frontend não deve tentar inferir disponibilidade MP3/WAV a partir de URLs de ficheiros.

O endpoint `POST /download` cria um URL assinado com validade de 120 segundos a partir do caminho privado guardado na linha do beat. O Supabase permite servir objetos de buckets privados por URLs assinados temporários; esses links continuam válidos até expirarem e não podem ser revogados individualmente sem mover, renomear ou apagar o objeto ([documentação oficial](https://supabase.com/docs/guides/storage/serving/downloads)). <https://supabase.com/docs/guides/storage/serving/downloads>

**Limite importante:** a auditoria encontrou o bucket `audios` público. Retirar o URL da resposta do catálogo não torna privado um objeto que continua num bucket público. A migração de Storage precisa de inventariar o campo `audio` (preview) e os downloads para separar os dois tipos de ficheiro sem quebrar a reprodução.

## Regras de consulta

- Listagem pública: selecionar explicitamente os campos permitidos e filtrar `status = 'published'`.
- Detalhe: localizar por `slug`, devolver um único beat e aplicar o mesmo filtro de publicação.
- Beat em rascunho ou arquivado: responder como não encontrado para visitantes, sem revelar que existe.
- Slug: usar o valor persistido na tabela, que já possui restrição de unicidade; não gerar um slug diferente no frontend.
- Ratings: para compatibilidade com o módulo atual, o endpoint devolve apenas pares `beat_id` e `rating`; nunca expõe `user_id`. A agregação pode ser feita no frontend até existir contrato agregado próprio.

## Compatibilidade e migração

A tabela atual usa `price text`; não converter o tipo nesta migração. Os campos `description`, `license_summary`, `license_terms` e `status` são adicionados de forma aditiva. Os registos existentes passam a `published` por omissão para preservar a visibilidade atual.

Migrações automáticas preparadas em `supabase/migrations/20261119000000_add_beat_detail_fields.sql`, `supabase/migrations/20261119010000_atomic_beat_plays.sql` e `supabase/migrations/20261119030000_private_beat_downloads.sql`. Ainda não foram aplicadas. A terceira cria o bucket privado `beat-downloads` e os campos `download_mp3_path`/`download_wav_path`. O script `supabase/manual/restrict_direct_table_access.sql` revoga os grants diretos de `anon`/`authenticated`, mas é manual para só ser executado depois da Edge Function nova estar publicada e testada. A Edge Function candidata está em `supabase/functions/api/index.ts`, mas ainda não foi publicada.

## Bloqueios antes da página pública final

1. Aplicar as três migrações automáticas numa base de teste e validar o bucket privado.
2. Copiar os downloads comerciais para `beat-downloads`, preencher os caminhos e remover apenas os objetos comerciais antigos do bucket público, sem tocar nos previews.
3. Executar `supabase/manual/lock_public_audios_writes.sql` depois de confirmar que nenhum fluxo legítimo depende dos uploads públicos.
4. Publicar uma versão de preview da função e validar que não devolve URLs privados nem passwords.
5. Executar manualmente `supabase/manual/restrict_direct_table_access.sql` e testar a API novamente.
6. Escolher e configurar o mecanismo de routing/geração de páginas compatível com o alojamento.
7. Confirmar o comportamento para slugs inválidos, beats não publicados e refresh em URL direto.
