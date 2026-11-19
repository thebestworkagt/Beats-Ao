-- Mantém previews antigos legíveis no bucket público "audios",
-- mas bloqueia INSERT, UPDATE e DELETE por clientes anon/authenticated.
-- Executar apenas depois de confirmar que uploads de browser/admin não dependem
-- destas policies. O backend com service_role contorna RLS.

DROP POLICY IF EXISTS "Deny client inserts into public audio previews"
  ON storage.objects;
CREATE POLICY "Deny client inserts into public audio previews"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'audios');

DROP POLICY IF EXISTS "Deny client updates to public audio previews"
  ON storage.objects;
CREATE POLICY "Deny client updates to public audio previews"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'audios')
  WITH CHECK (bucket_id <> 'audios');

DROP POLICY IF EXISTS "Deny client deletes from public audio previews"
  ON storage.objects;
CREATE POLICY "Deny client deletes from public audio previews"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'audios');

-- Não altera a leitura pública: os previews existentes continuam acessíveis.
-- Antes da limpeza final, remover apenas objetos comerciais antigos que já
-- estejam confirmados no bucket privado "beat-downloads".
