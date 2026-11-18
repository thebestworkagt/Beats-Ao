# Supabase

Esta pasta será a fonte versionada do backend e da base de dados.

Estrutura prevista:

```text
supabase/
├── functions/
│   └── api/
│       └── index.ts
└── migrations/
    └── YYYYMMDDHHMMSS_descricao.sql
```

## Estado

O código atualmente publicado da Edge Function `api` foi copiado pelo proprietário para a conversa e analisado, mas ainda não foi validado como versão canónica nem migrado para este repositório.

**Não publicar uma cópia desse código sem corrigir os problemas de segurança identificados.** A versão atual seleciona todas as colunas de `beats`, incluindo campos que não devem ser públicos, e usa uma comparação direta de palavra-passe para autorizar downloads.

Antes de adicionar a função aqui:

1. Confirmar a versão exata que está publicada no projeto Supabase.
2. Criar uma versão corrigida, com autorização no servidor.
3. Identificar secrets necessários; guardar os valores apenas no Supabase.
4. Preparar migrações não destrutivas e validar em ambiente de teste.
5. Publicar apenas depois de testes e aprovação.

Nunca guardar valores de secrets neste repositório.
