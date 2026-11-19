-- Gera automaticamente slugs URL-friendly e únicos para novos beats.
-- Os slugs existentes são preservados quando já são válidos.
-- A tabela já possui a restrição única beats_slug_key.

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
  IF NEW.slug IS NOT NULL
     AND NEW.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    base_slug := NEW.slug;
  ELSE
    base_slug := public.beats_make_slug(NEW.title);
  END IF;

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'beat';
  END IF;

  base_slug := left(base_slug, 140);
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

COMMENT ON FUNCTION public.beats_make_slug(text) IS
  'Normaliza títulos de beats para slugs URL-friendly.';

COMMENT ON FUNCTION public.beats_assign_slug() IS
  'Gera um slug válido e único antes de inserir ou atualizar um beat.';
