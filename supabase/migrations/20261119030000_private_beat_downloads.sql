-- Cria armazenamento privado e campos para identificar os ficheiros originais.
-- Os ficheiros atuais em "audios" não são copiados nem eliminados.
-- A migração é aditiva e mantém o bucket público atual para previews.

ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS download_mp3_path text,
  ADD COLUMN IF NOT EXISTS download_wav_path text;

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'beat-downloads',
  'beat-downloads',
  false,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Defesa adicional: bloqueia acessos do browser ao bucket privado,
-- mesmo se existir outra policy permissiva genérica em storage.objects.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Deny client access to private beat downloads'
  ) THEN
    CREATE POLICY "Deny client access to private beat downloads"
      ON storage.objects
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (bucket_id <> 'beat-downloads')
      WITH CHECK (bucket_id <> 'beat-downloads');
  END IF;
END;
$$;

COMMENT ON COLUMN public.beats.download_mp3_path IS
  'Caminho relativo no bucket privado beat-downloads; nunca URL pública.';
COMMENT ON COLUMN public.beats.download_wav_path IS
  'Caminho relativo no bucket privado beat-downloads; nunca URL pública.';
