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
- `migrations/20261119010000_atomic_beat_plays.sql`: cria incremento atómico de reproduções para beats publicados.

As duas migrações ainda não foram aplicadas.

## Edge Function versionada

O candidato está em `functions/api/index.ts`. Mantém os caminhos utilizados pelo frontend e acrescenta `GET /beat/:slug`.

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
- A auditoria anterior identificou grants, políticas RLS e bucket Storage excessivamente permissivos; continuam por corrigir.

Nunca guardar valores de secrets neste repositório.
