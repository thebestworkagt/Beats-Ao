-- Gera slugs persistentes e únicos para beats.
-- Preserva slugs existentes que já são válidos; corrige apenas valores vazios/inválidos.
-- Esta migração deve ser aplicada primeiro num ambiente de teste.

CREATE OR REPLACE FUNCTION public.beats_make_slug(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(
    regexp_replace(
      translate(
        lower(coalesce(p_title, '')),
        'áàâãäåéèêëíìîïóòôõöúùûüçñ',
        'aaaaaaeeeeiiiiooooouuuucn'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '-{2,}',
    '-',
    'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.beats_assign_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix integer := 2;
BEGIN
  -- Mantém um slug já válido, exceto quando entra em conflito com outro registo.
  IF NEW.slug IS NOT NULL
     AND NEW.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     AND NOT EXISTS (
       SELECT 1
       FROM public.beats b
       WHERE b.slug = NEW.slug
         AND b.id IS DISTINCT FROM NEW.id
     ) THEN
    RETURN NEW;
  END IF;

  base_slug := public.beats_make_slug(NEW.title);
  IF base_slug = '' THEN
    base_slug := 'beat';
  END IF;
  base_slug := left(base_slug, 140);
  candidate := base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.beats b
    WHERE b.slug = candidate
      AND b.id IS DISTINCT FROM NEW.id
  ) LOOP
    candidate := left(base_slug, 140 - length(suffix::text) - 1)
      || '-' || suffix::text;
    suffix := suffix + 1;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS beats_assign_slug_before_write ON public.beats;

CREATE TRIGGER beats_assign_slug_before_write
BEFORE INSERT OR UPDATE OF title, slug
ON public.beats
FOR EACH ROW
EXECUTE FUNCTION public.beats_assign_slug();

-- Corrige registos antigos sem slug ou com formato inválido.
-- Slugs válidos existentes (como "beat-x") permanecem inalterados.
DO $$
DECLARE
  beat_row record;
BEGIN
  FOR beat_row IN
    SELECT id
    FROM public.beats
    WHERE slug IS NULL
       OR slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ORDER BY id
  LOOP
    UPDATE public.beats
    SET slug = NULL
    WHERE id = beat_row.id;
  END LOOP;
END;
$$;

-- Impede duplicados no futuro. Se já existir uma restrição/índice equivalente,
-- o índice IF NOT EXISTS evita recriá-lo pelo mesmo nome.
CREATE UNIQUE INDEX IF NOT EXISTS beats_slug_unique_idx
  ON public.beats (slug);

COMMENT ON FUNCTION public.beats_make_slug(text) IS
  'Normaliza títulos de beats para slugs URL-friendly.';
COMMENT ON FUNCTION public.beats_assign_slug() IS
  'Gera um slug válido e único antes de inserir/atualizar um beat.';
