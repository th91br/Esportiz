# Recuperacao de desastre e operacao do banco

Este runbook cobre o PostgreSQL gerenciado pelo Supabase e os deploys do Esportiz. Ele nao autoriza operacoes destrutivas por conta propria.

Referencias oficiais:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/local-development/cli-workflows

## Responsabilidade e objetivos

Responsavel primario: proprietario tecnico da conta Supabase.
Aprovador de restore em producao: proprietario do negocio e responsavel tecnico.

Objetivos propostos para dados financeiros, agenda e identidade:

- RPO alvo: ate 15 minutos com PITR habilitado.
- RTO alvo: ate 4 horas, condicionado a um restore drill medido.
- Sem PITR, o RPO real fica limitado pela frequencia do backup disponivel no plano.

O plano contratado, a retencao e o ponto de restauracao mais recente devem ser confirmados no Dashboard do Supabase. O repositorio nao prova que PITR ou backups diarios estao ativos.

## Regras invariantes

1. Nunca executar supabase db reset --linked em producao.
2. Nunca usar --include-seed em producao.
3. Nunca enviar dumps com dados pessoais ou financeiros para Git, artifacts de CI, email ou armazenamento sem criptografia.
4. Toda mudanca de schema nasce em supabase/migrations e passa pelo replay descartavel.
5. Migracoes publicadas sao imutaveis. Correcoes usam uma nova migracao.
6. Alteracoes destrutivas usam expand-contract e uma janela de observacao.
7. Restore em producao exige aprovacao humana e registro do horario escolhido.

## Antes de uma migracao

1. Confirmar o projeto alvo e o ambiente.
2. Confirmar no Dashboard que existe um ponto de recuperacao anterior a mudanca.
3. Executar npm run check:migrations.
4. Aguardar Database migrations verde no pull request.
5. Aplicar primeiro em homologacao.
6. Executar npm run test:e2e:staging:local.
7. Executar supabase db push --dry-run no projeto alvo.
8. Revisar locks, reescritas de tabela, funcoes SECURITY DEFINER, grants e RLS.
9. Programar mudancas de alto risco fora do pico e anunciar a janela.

## Estrategia de rollback

Aplicacao:

1. Suspender novos deploys.
2. Promover o ultimo deployment Vercel conhecido como saudavel.
3. Executar os monitores publicos e a homologacao autenticada.

Banco:

1. Preferir uma nova migracao corretiva e compatibilidade retroativa.
2. Nao editar nem apagar uma migracao ja aplicada.
3. Em expand-contract, manter colunas e funcoes antigas ate a nova versao estar estavel.
4. Se houver corrupcao ou perda de dados, interromper escritas e seguir o restore.
5. Migration repair corrige apenas o historico; nao reverte SQL. Usar somente apos comparar schema e historico.

## Restore de producao

1. Abrir um registro de incidente com impacto e horario da ultima escrita confiavel.
2. Colocar o sistema em manutencao ou bloquear escritas.
3. Escolher o ponto imediatamente anterior ao incidente.
4. Registrar o RPO esperado e obter aprovacao dos dois responsaveis.
5. Restaurar pelo Dashboard do Supabase ou pelo procedimento oficial de PITR.
6. Aguardar o banco ficar disponivel; nao iniciar deploy simultaneo.
7. Validar autenticacao, organizacoes, agenda, pagamentos, vendas, comandas e RLS.
8. Executar os audits em supabase/audits e a homologacao autenticada.
9. Reabrir escritas gradualmente e monitorar erros.
10. Registrar RPO, RTO, causa, dados afetados e acoes preventivas.

## Restore drill

Frequencia minima: trimestral e depois de mudanca relevante no modelo de dados.

1. Criar um projeto temporario isolado.
2. Restaurar um backup aprovado no projeto temporario.
3. Apontar uma build de homologacao somente para esse projeto.
4. Executar jornadas autenticadas e audits de RLS.
5. Medir tempo total, documentar falhas e comparar com o RTO alvo.
6. Destruir o projeto temporario e qualquer copia local de forma controlada.

Um backup so deve ser considerado operacional depois de um restore drill bem-sucedido.

## Dumps logicos

Dumps manuais sao uma camada adicional, nao substituem o backup gerenciado.

- Schema pode ser exportado para comparacao, sem dados de clientes.
- Dump de dados deve ser criptografado no momento da criacao.
- A chave de criptografia deve ficar separada do arquivo.
- Definir retencao, responsavel, local aprovado e teste de restauracao.
- Nunca automatizar dump de producao em um pull request.

## Evidencias mensais

Registrar fora do repositorio:

- plano e retencao de backup ativos;
- horario do ultimo ponto de recuperacao;
- resultado do ultimo restore drill;
- RPO e RTO medidos;
- responsaveis e contatos atualizados;
- incidentes e acoes pendentes.