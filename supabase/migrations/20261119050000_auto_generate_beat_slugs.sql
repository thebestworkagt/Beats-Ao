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
  -- Preserva um slug válido já atribuído; caso contrário, deriva-o do título.
  IF NEW.slug IS NOT NULL
     AND NEW.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    base_slug := NEW.slug;
  ELSE
    base_slug := public.beats_make_slug(NEW.title);
  END IF;

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'beat';
  END IF;
  base_slug := left(base_slug, 140);

  -- Serializa a atribuição do mesmo slug-base para evitar colisões concorrentes.
  PERFORM pg_advisory_xact_lock(hashtext(base_slug)::bigint);

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

-- Corrige registos antigos sem slug, com formato inválido ou duplicados.
-- Em cada grupo duplicado, preserva o registo de menor id e regenera os restantes.
-- O trigger deriva o novo slug do título e acrescenta sufixos quando necessário.
DO $
DECLARE
  beat_row record;
BEGIN
  FOR beat_row IN
    SELECT id
    FROM public.beats
    WHERE slug IS NULL
       OR slug !~ '^[a-z0-9]+(-[a-z0-9]+)*CREATE UNIQUE INDEX IF NOT EXISTS beats_slug_unique_idx
  ON public.beats (slug);

COMMENT ON FUNCTION public.beats_make_slug(text) IS
  'Normaliza títulos de beats para slugs URL-friendly.';
COMMENT ON FUNCTION public.beats_assign_slug() IS
  'Gera um slug válido e único antes de inserir/atualizar um beat.';

    ORDER BY id
  LOOP
    UPDATE public.beats
    SET slug = '!'
    WHERE id = beat_row.id;
  END LOOP;

  FOR beat_row IN
    SELECT id
    FROM (
      SELECT
        id,
        row_number() OVER (PARTITION BY slug ORDER BY id) AS duplicate_position
      FROM public.beats
      WHERE slug ~ '^[a-z0-9]+(-[a-z0-9]+)*CREATE UNIQUE INDEX IF NOT EXISTS beats_slug_unique_idx
  ON public.beats (slug);

COMMENT ON FUNCTION public.beats_make_slug(text) IS
  'Normaliza títulos de beats para slugs URL-friendly.';
COMMENT ON FUNCTION public.beats_assign_slug() IS
  'Gera um slug válido e único antes de inserir/atualizar um beat.';

    ) ranked
    WHERE duplicate_position > 1
    ORDER BY id
  LOOP
    UPDATE public.beats
    SET slug = '!'
    WHERE id = beat_row.id;
  END LOOP;
END;
$;

-- Impede duplicados no futuro. Se já existir uma restrição/índice equivalente,
-- o índice IF NOT EXISTS evita recriá-lo pelo mesmo nome.
CREATE UNIQUE INDEX IF NOT EXISTS beats_slug_unique_idx
  ON public.beats (slug);

COMMENT ON FUNCTION public.beats_make_slug(text) IS
  'Normaliza títulos de beats para slugs URL-friendly.';
COMMENT ON FUNCTION public.beats_assign_slug() IS
  'Gera um slug válido e único antes de inserir/atualizar um beat.';
