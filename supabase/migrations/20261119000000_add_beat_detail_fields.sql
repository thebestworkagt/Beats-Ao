-- Beats Ao: campos complementares para páginas individuais dos beats.
-- Migração aditiva: não remove nem altera dados existentes.
-- Os beats atuais permanecem publicados por omissão.

ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS license_summary text,
  ADD COLUMN IF NOT EXISTS license_terms text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'beats_status_allowed'
      AND conrelid = 'public.beats'::regclass
  ) THEN
    ALTER TABLE public.beats
      ADD CONSTRAINT beats_status_allowed
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS beats_public_slug_idx
  ON public.beats (slug)
  WHERE status = 'published';

COMMENT ON COLUMN public.beats.description IS
  'Descrição pública apresentada na página individual do beat.';
COMMENT ON COLUMN public.beats.license_summary IS
  'Resumo público das condições de licença do beat.';
COMMENT ON COLUMN public.beats.license_terms IS
  'Termos completos de licença apresentados ao comprador.';
COMMENT ON COLUMN public.beats.status IS
  'Estado de publicação: draft, published ou archived.';
