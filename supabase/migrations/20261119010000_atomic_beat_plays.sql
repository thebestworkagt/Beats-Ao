-- Atomic play counter for published beats only.
-- Depends on 20261119000000_add_beat_detail_fields.sql.

CREATE OR REPLACE FUNCTION public.increment_beat_plays(p_beat_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_play_count integer;
BEGIN
  UPDATE public.beats
  SET plays = COALESCE(plays, 0) + 1
  WHERE id = p_beat_id
    AND status = 'published'
  RETURNING plays INTO new_play_count;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN new_play_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_beat_plays(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_beat_plays(bigint) TO anon, authenticated;

COMMENT ON FUNCTION public.increment_beat_plays(bigint) IS
  'Incrementa atomicamente a contagem de plays de um beat publicado.';
