# Supabase

Esta pasta contém a versão candidata e versionada do backend e as migrações SQL do projeto.

Estrutura prevista:

```text
supabase/
├── functions/
│   └── api/
│       └── index.ts
└── migrations/
    └── YYYYMMDDHHMMSS_descricao.sql
```

## Migrações preparadas

- `migrations/20261119000000_add_beat_detail_fields.sql`: adiciona descrição, resumo/termos de licença e estado de publicação.
- `migrations/20261119010000_atomic_beat_plays.sql`: cria incremento atómico de reproduções para beats publicados e limita a RPC ao backend.
- `migrations/20261119020000_restrict_direct_table_access.sql`: revoga o acesso direto de `anon` e `authenticated` às tabelas internas e concede apenas os privilégios necessários a `service_role`.

As três migrações ainda não foram aplicadas.

## Ordem obrigatória de publicação

A ordem abaixo evita interromper a API antiga antes de a versão privilegiada estar ativa:

1. Fazer backup e testar numa instância de desenvolvimento.
2. Aplicar `20261119000000_add_beat_detail_fields.sql`.
3. Aplicar `20261119010000_atomic_beat_plays.sql`.
4. Publicar `functions/api/index.ts` e confirmar que a função lê `SUPABASE_SECRET_KEYS` no runtime.
5. Testar `GET /beats`, `GET /beat/:slug`, `GET /ratings`, `POST /play`, `POST /rate` e `POST /download` num beat de teste.
6. Só depois de confirmar que todas as rotas necessárias funcionam, aplicar `20261119020000_restrict_direct_table_access.sql`.
7. Testar que as consultas diretas às tabelas falham com a chave pública e que a Edge Function continua a funcionar.
8. Publicar o frontend que lê `available_formats`; testar MP3, WAV e beat sem ficheiros disponíveis.

**Nunca executar o passo 6 antes do passo 4 e da validação do passo 5.** Caso contrário, a função antiga, que usa a chave pública, pode perder acesso às tabelas.

## Edge Function versionada

O candidato está em `functions/api/index.ts`. Mantém os caminhos utilizados pelo frontend e acrescenta `GET /beat/:slug`. Usa `SUPABASE_SECRET_KEYS` (chave `default`) exclusivamente no servidor; não usa a chave pública para consultar colunas privadas. A configuração `config.toml` define `verify_jwt = false` porque o browser chama estas rotas públicas sem JWT; a própria função aplica validações e nunca devolve a chave.

**Ainda não foi publicado no Supabase.** Depende das duas migrações acima e da validação em ambiente de teste. Não copiar para produção antes de rever os pontos pendentes abaixo.

### Melhorias incluídas

- `GET /beats` usa uma lista explícita de colunas e filtra apenas beats publicados.
- `GET /beat/:slug` devolve um único beat publicado.
- Os campos de password e URLs de download não são incluídos em respostas públicas.
- `available_formats` informa apenas se MP3/WAV estão disponíveis.
- `GET /ratings` devolve apenas `beat_id` e `rating`, nunca `user_id`.
- `POST /play` utiliza função SQL atómica.
- Validação básica de IDs, notas, formatos e tamanho do corpo.
- CORS limitado aos domínios configurados no código.

### Riscos que permanecem

- `POST /rate` continua anónimo e não tem limitação persistente de frequência; a identidade fornecida pelo browser não é aceite como prova de identidade.
- `POST /download` continua a comparar uma password guardada em texto simples e a devolver o URL de download após a validação. É compatibilidade temporária, não autorização comercial robusta.
- Não existe ainda autenticação administrativa nem CRUD de beats.
- CORS não é autenticação e não impede chamadas diretas fora do navegador.
- A migração para revogar grants diretos está preparada, mas não aplicada; as permissões RLS antigas permanecem no SQL e devem ser revistas após restringir os grants.
- O bucket `audios` foi observado como público, com políticas de leitura/escrita/alteração/eliminação permissivas. Não foi tornado privado porque o campo `audio` pode depender dele para previews; é necessário inventariar os objetos e separar previews públicos de downloads privados.
- Até corrigir o Storage, não se deve tratar um URL de ficheiro como protegido só por não o devolver no catálogo.

Nunca guardar valores de secrets neste repositório. A chave secreta padrão é injetada no runtime Supabase através de `SUPABASE_SECRET_KEYS`; a função lê `default`. Consultar a documentação oficial de [Environment variables](https://supabase.com/docs/guides/functions/secrets).
