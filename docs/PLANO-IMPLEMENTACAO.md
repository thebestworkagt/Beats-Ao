# Plano técnico de recuperação e evolução — Beats Ao

## Estado de partida verificado

- Repositório: `thebestworkagt/Beats-Ao`
- Branch de produção: `main`
- Branch de trabalho: `hardening/admin-foundation`
- O repositório contém atualmente uma página `index.html`, imagens, CNAME e sitemap.
- Não existe código Supabase/Edge Function versionado neste repositório.
- O `index.html` atual chama a Edge Function pública em `/functions/v1/api`.
- O painel administrativo está desativado no frontend: login/logout apenas mostram a mensagem "Admin desativado"; a eliminação de beats também está desativada.
- O frontend força `isLoggedIn = false` e `currentUser = null` durante a inicialização.
- A página pública carrega `/beats`, que no código da função atualmente seleciona todas as colunas da tabela.
- A página cria sempre os dois botões de download MP3 e WAV, mesmo quando o link correspondente está vazio.
- O código da Edge Function fornecido pelo proprietário ainda não está versionado no repositório.

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

## Riscos confirmados na auditoria inicial

- A rota pública `GET /beats` usa `.select('*')`, incluindo potencialmente `password` e URLs de download.
- A rota `POST /download` compara a palavra-passe diretamente com a coluna `beats.password`; não há limitação de tentativas nem verificação de compra/licença.
- As rotas de avaliação aceitam um `userId` enviado pelo cliente, que não é uma identidade autenticada confiável.
- A contagem de reproduções é feita por leitura seguida de atualização, não sendo atómica.
- O CORS permite qualquer origem; isto não substitui nem resolve autorização.
- Na auditoria SQL anterior foram observados privilégios excessivos para `anon` e `authenticated`, políticas permissivas e políticas de Storage públicas para o bucket `audios`. A migração deve ser preparada após validar o modelo de autenticação e o acesso legítimo aos ficheiros.

## Ordem de execução

### Fase 0 — preservar e estabelecer base
- Trabalhar nesta branch isolada.
- Manter `main` e produção inalterados até revisão e aprovação.
- Versionar o código da Edge Function e as migrações SQL no repositório.

### Fase 1 — segurança e contrato da API
- Definir autenticação administrativa no servidor.
- Separar campos públicos de campos privados.
- Remover segredos e URLs protegidas das respostas públicas.
- Corrigir permissões SQL, RLS e políticas de Storage com base no modelo de autorização.
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
- Testes automatizados e testes manuais em preview.
- Publicação apenas após validação do proprietário.

## Regras de segurança e publicação

- Nunca colocar `service_role`, chaves secretas ou credenciais no frontend.
- Não confiar em `userId`, preço, estado de pagamento ou permissões enviados pelo navegador.
- Não remover ficheiros nem dados existentes sem inventário e confirmação.
- Não aplicar migrações destrutivas diretamente em produção.
- Não fazer merge nem deploy para produção sem validação explícita.
