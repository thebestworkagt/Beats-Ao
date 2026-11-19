# Migração segura do Storage — Beats Ao

## Estado atual conhecido

- O bucket `audios` está público e pode conter previews e ficheiros comerciais.
- O campo `beats.audio` é usado pelo player público.
- Os campos antigos `audio_download_mp3` e `audio_download_wav` guardam URLs, que podem apontar para ficheiros atualmente públicos.
- O bucket novo `beat-downloads` será privado.
- Os campos novos `download_mp3_path` e `download_wav_path` guardam apenas caminhos relativos dentro desse bucket.
- A Edge Function candidata só assina downloads a partir dos caminhos privados novos. Não usa os URLs antigos.

## Regra principal

**Não tornar o bucket `audios` privado nem apagar objetos antes de inventariar e testar todos os previews.** A migração não move automaticamente ficheiros existentes.

## 1. Inventário somente de leitura

Executar no SQL Editor do Supabase, antes de qualquer alteração:

```sql
SELECT
  id,
  title,
  audio,
  audio_download_mp3,
  audio_download_wav,
  download_mp3_path,
  download_wav_path
FROM public.beats
ORDER BY id;

SELECT
  name,
  metadata->>'mimetype' AS mime_type,
  metadata->>'size' AS size_bytes,
  created_at
FROM storage.objects
WHERE bucket_id = 'audios'
ORDER BY name;
```

Guardar o resultado fora do repositório como mapa de referência. Não publicar nem partilhar URLs de download antigos.

## 2. Preparar os ficheiros comerciais

Depois de aplicar `20261119030000_private_beat_downloads.sql`:

- Upload MP3 para `beat-downloads/beats/<id>/mp3/<nome>.mp3`.
- Upload WAV para `beat-downloads/beats/<id>/wav/<nome>.wav`.
- Usar apenas nomes de ficheiro simples, com letras, números, hífen ou sublinhado.
- Confirmar que cada upload termina sem erro e que o ficheiro tem tamanho maior que zero.

O caminho guardado no banco é relativo ao bucket, por exemplo `beats/42/mp3/instrumental.mp3` — sem domínio, sem `/storage/v1` e sem prefixo do bucket.

## 3. Atualizar a linha do beat

Só depois do upload, guardar o caminho correspondente:

```sql
UPDATE public.beats
SET
  download_mp3_path = 'beats/42/mp3/instrumental.mp3',
  download_wav_path = 'beats/42/wav/instrumental.wav'
WHERE id = 42;
```

Substituir o ID e nomes de exemplo pelos valores do inventário. Para um formato inexistente, manter a coluna correspondente como `NULL`.

## 4. Testar antes de limpar

- Confirmar que `GET /beats` devolve apenas `available_formats`, sem caminhos e sem URLs privados.
- Confirmar que `POST /download` gera um URL assinado de 120 segundos.
- Confirmar que o URL público tradicional do novo bucket privado não permite descarregar o objeto.
- Confirmar que a reprodução dos previews no campo `audio` continua a funcionar.
- Testar MP3 existente, WAV existente e um beat sem ficheiros.

## 5. Remover cópias antigas

Só depois de confirmar os novos downloads e previews:

- Identificar no bucket antigo `audios` apenas os objetos comerciais copiados.
- Remover esses objetos através do Supabase Storage Dashboard ou da Storage API.
- Não eliminar diretamente linhas de `storage.objects` com SQL.
- Nunca remover um objeto que ainda seja usado no campo `audio` como preview.

Os antigos URLs públicos deixam de ser utilizáveis apenas depois de os objetos antigos serem removidos. Links assinados emitidos do bucket privado podem permanecer válidos até expirar; não podem ser revogados individualmente. <https://supabase.com/docs/guides/storage/serving/downloads>

## 6. Endurecimento final

Após migrar os ficheiros:

1. Executar `manual/lock_public_audios_writes.sql` para impedir INSERT/UPDATE/DELETE por clientes no bucket público de previews.
2. Publicar e testar a Edge Function que usa a chave secreta apenas no servidor.
3. Executar `manual/restrict_direct_table_access.sql` para retirar o acesso direto do browser às tabelas de negócio.
4. Repetir os testes de catálogo, ratings, plays, previews e downloads.

## Limitações ainda abertas

- A password atual dos downloads continua em texto simples. O URL assinado protege o objeto no Storage, mas a verificação atual ainda não prova compra nem licença.
- Ainda não existe painel administrativo com upload seguro para os caminhos novos.
- Este procedimento é de migração manual; a automação de uploads será acrescentada quando existir autenticação administrativa real.
