# Plano técnico de recuperação e evolução — Beats Ao

## Estado de partida verificado

- Repositório: `thebestworkagt/Beats-Ao`
- Branch de produção: `main`
- Branch de trabalho: `hardening/admin-foundation`
- O repositório contém atualmente uma página `index.html`, imagens, CNAME e sitemap.
- Existe uma versão candidata da Edge Function em `supabase/functions/api/index.ts`; ainda não está publicada no projeto Supabase.
- O `index.html` atual chama a Edge Function pública em `/functions/v1/api`.
- O painel administrativo está desativado no frontend: login/logout apenas mostram a mensagem "Admin desativado"; a eliminação de beats também está desativada.
- O frontend força `isLoggedIn = false` e `currentUser = null` durante a inicialização.
- A versão atualmente publicada da função foi observada a usar `/beats` com `.select('*')`; o candidato versionado substitui isso por uma allowlist.
- O candidato do frontend mostra MP3/WAV apenas quando `available_formats` confirma disponibilidade; depende da nova Edge Function.
- A Edge Function candidata está versionada, mas requer as três migrações automáticas, execução posterior do script manual de grants, migração dos ficheiros e testes antes de publicação.

## Requisitos funcionais recolhidos

1. Catálogo público de beats, com previews e informação pública apenas.
2. Downloads por formato, mostrando MP3/WAV apenas quando o respetivo ficheiro estiver configurado para aquele beat; suportar formatos adicionais no futuro.
3. Painel administrativo recuperado e completo para gerir beats, ficheiros, preços, publicação e opções comerciais.
4. Editor visual profundo: cores, botões, tipografia, cartões, espaçamento, sombras, bordas, cabeçalho, rodapé, temas, pré-visualização, rascunho, publicação e reposição.
5. Notificações administrativas e notificações destinadas aos clientes, com preferências, estado lido/arquivado.
6. Gestão de sessões: dispositivos, início/último acesso, expiração, encerramento individual e encerramento de outras sessões.
7. Registo de atividade administrativa, tentativas de autenticação e eventos relevantes de segurança.
8. Preparação para compras, encomendas, pagamentos e licenças, sem presumir que um pagamento foi confirmado só pelo frontend.
9. Arquitetura extensível para permitir novas opções no painel sem alterações manuais ao código sempre que possível.

## Preparação de páginas individuais

- Criada a especificação de URL e routing em `docs/ROTAS-E-PAGINAS-BEATS.md`.
- Criada a função candidata `supabase/functions/api/index.ts` com catálogo por allowlist e consulta por slug.
- Implementado `404.html` como fallback transitório e `assets/js/features/beat-detail-page.js` para detalhes por slug.
- Implementados links de detalhe nos cards e URLs de partilha `/beats/<slug>/`.
- Criado o gerador `scripts/generate-beat-pages.mjs`, que pré-renderiza `dist/beats/<slug>/index.html` com metadados e sitemap.
- Preparado incremento atómico de reproduções em `20261119010000_atomic_beat_plays.sql`; não aplicado.
- Preparado bucket privado `beat-downloads` e campos de caminho em `20261119030000_private_beat_downloads.sql`; não aplicado.
- API candidata agora cria URLs assinados de 120 segundos para caminhos privados e já não lê os antigos URLs de download.
- Preparado o script manual `supabase/manual/restrict_direct_table_access.sql` para revogar grants diretos `anon`/`authenticated`; ainda não aplicado.
- Preparado o script manual `supabase/manual/lock_public_audios_writes.sql` para bloquear alterações públicas no bucket de previews sem bloquear leituras; ainda não aplicado.
- Criado `docs/MIGRACAO-STORAGE.md` com consultas de inventário, padrão de caminhos, teste de URLs assinados e sequência de remoção dos objetos públicos antigos. Foi retirado da pasta automática de migrações para não correr antes da publicação da nova API.
- Edge Function passou a usar `SUPABASE_SECRET_KEYS` apenas no servidor, para permitir retirar o acesso direto do browser às tabelas.
- Frontend passou a consumir `available_formats` para mostrar apenas os formatos existentes.
- Criado o contrato de allowlist da API em `docs/API-PUBLICA-BEATS.md`.
- Preparada migração aditiva `20261119000000_add_beat_detail_fields.sql`; não aplicada à base de dados.
- Implementada uma página de detalhe por slug nesta branch, com fallback `404.html`, controlador e estilos.
- Criado `scripts/generate-beat-pages.mjs` para gerar páginas estáticas com HTTP 200 e sitemap a partir da API pública.
- Falta configurar/testar o workflow GitHub Pages por Actions; o fallback 404 é apenas transitório.

## Riscos confirmados na auditoria inicial

- A rota pública `GET /beats` usa `.select('*')`, incluindo potencialmente `password` e URLs de download.
- A rota `POST /download` compara a palavra-passe diretamente com a coluna `beats.password`; não há limitação de tentativas nem verificação de compra/licença.
- As rotas de avaliação aceitam um `userId` enviado pelo cliente, que não é uma identidade autenticada confiável.
- A contagem de reproduções é feita por leitura seguida de atualização, não sendo atómica.
- O CORS permite qualquer origem; isto não substitui nem resolve autorização.
- Na auditoria SQL anterior foram observados privilégios excessivos para `anon` e `authenticated`, políticas permissivas e políticas de Storage públicas para o bucket `audios`. Foram preparadas migrações, mas ainda não foram aplicadas; é preciso testar a ordem de publicação e separar os previews dos downloads no Storage.

## Ordem de execução

### Fase 0 — preservar e estabelecer base
- Trabalhar nesta branch isolada.
- Manter `main` e produção inalterados até revisão e aprovação.
- Versionar o código da Edge Function e as migrações SQL no repositório. (Candidato e migrações já estão versionados nesta branch.)

### Fase 1 — segurança e contrato da API
- Rever e testar a Edge Function candidata antes da publicação.
- Aplicar em ambiente de teste as três migrações automáticas; publicar e testar a API; só depois executar o script manual de grants restritos.
- Definir autenticação administrativa no servidor.
- Separar campos públicos de campos privados.
- Remover segredos e URLs protegidas das respostas públicas.
- Aplicar os scripts manuais de Storage e grants na sequência documentada; rever policies RLS residuais e confirmar que só previews permanecem no bucket público.
- Criar downloads autorizados e links temporários quando apropriado.
- Validar tipos, limites, erros, CORS e proteção contra abuso.

### Fase 2 — recuperar gestão administrativa
- Login/logout reais com sessões seguras.
- CRUD de beats e gestão de capas/áudios.
- Publicação/rascunho e validação dos formatos disponíveis.
- Permissões administrativas e registo de ações.

### Fase 3 — configuração visual e funcionalidades de operação
- Configurações de tema persistentes e editor visual.
- Notificações administrativas e de clientes.
- Gestão e revogação de sessões.
- Histórico de atividade e alertas.

### Fase 4 — comércio e validação
- Modelo de encomendas, pagamentos e licenças.
- Só conceder downloads pagos após confirmação confiável do pagamento.
- Testes automatizados e testes manuais em preview, incluindo build estático por slug.
- Publicação apenas após validação do proprietário.

## Regras de segurança e publicação

- Nunca colocar `service_role`, chaves secretas ou credenciais no frontend.
- Não confiar em `userId`, preço, estado de pagamento ou permissões enviados pelo navegador.
- Não remover ficheiros nem dados existentes sem inventário e confirmação.
- Não aplicar migrações destrutivas diretamente em produção.
- Não fazer merge nem deploy para produção sem validação explícita.
