-- Bloqueia acesso direto do browser às tabelas internas.
-- A Edge Function usa SUPABASE_SECRET_KEYS apenas no servidor.
-- Antes de aplicar, confirmar que o site só acede a estas tabelas via /functions/v1/api.

REVOKE ALL PRIVILEGES ON TABLE public.beats FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.ratings FROM anon, authenticated;

-- Privilégios mínimos exigidos pelas rotas atualmente versionadas.
GRANT SELECT, UPDATE ON TABLE public.beats TO service_role;
GRANT SELECT, INSERT ON TABLE public.ratings TO service_role;

-- Garante a utilização da sequência de ratings quando o ID é serial.
DO $$
DECLARE
  ratings_sequence text;
BEGIN
  ratings_sequence := pg_get_serial_sequence('public.ratings', 'id');
  IF ratings_sequence IS NOT NULL THEN
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %s TO service_role',
      ratings_sequence
    );
  END IF;
END;
$$;

COMMENT ON TABLE public.beats IS
  'Acesso de browser deve ocorrer através da Edge Function; service_role reservado ao backend.';
COMMENT ON TABLE public.ratings IS
  'Acesso de browser deve ocorrer através da Edge Function; service_role reservado ao backend.';
